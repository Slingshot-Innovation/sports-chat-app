import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fetchSportsData() {
    const { data, error } = await supabase
        .from('sports')
        .select('id, name, leagues')

    if (error) throw error;
    return data;
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, retries = 8) {
    for (let i = 0; i < retries; i++) {
        try {
            const res = await fetch(url);
            if (res.status === 429) {
                console.log('Rate limit reached. Waiting 10 seconds before retrying...');
                await delay(10000);
                continue;
            }
            if (!res.ok) {
                throw new Error(`HTTP error! Status: ${res.status}`);
            }
            return await res.json();
        } catch (error) {
            if (i === retries - 1) throw error;
        }
    }
}

async function fetchScheduleData(leagueId) {
    try {
        const data = await fetchWithRetry(`https://www.thesportsdb.com/api/v1/json/60130162/eventsseason.php?id=${leagueId}&s=2024-2025`);
        return { leagueId, events: data.events || [] };
    } catch (error) {
        console.error(`Unable to fetch data for league ${leagueId}:`, error);
        return { leagueId, events: [] };
    }
}

function mapEventToDbStructure(event, leagueId, sportId) {
    let startTime = null;
    let endTime = null;

    if (event.strTimestamp && event.strTimestamp !== "0000-00-00T00:00:00") {
        try {
            const date = new Date(event.strTimestamp + 'Z');  // Append 'Z' to ensure UTC interpretation
            
            if (!isNaN(date.getTime())) {
                startTime = date.toISOString();
                endTime = new Date(date.getTime() + 4 * 60 * 60 * 1000).toISOString(); // Assuming 4 hours duration
            }
        } catch (error) {
            console.error(`Error processing date for event:`, JSON.stringify(event, null, 2));
            console.error(`Error details:`, error);
        }
    }

    return {
        home_team: event.strHomeTeam || null,
        away_team: event.strAwayTeam || null,
        event_name: event.strEvent,
        start_time: startTime,
        end_time: endTime,
        status: ['Not Started', 'NS', 'Time to be defined', null].includes(event.strStatus) ? 'scheduled' : 'finished',
        created_at: new Date().toISOString(),
        sport_id: sportId,
        league_id: parseInt(leagueId)
    };
}

function validateGame(game) {
    const requiredFields = ['sport_id', 'league_id', 'event_name', 'status'];
    const missingFields = requiredFields.filter(field => game[field] === undefined || game[field] === null || game[field] === '');

    if (missingFields.length > 0) {
        console.warn(`Invalid game, missing fields: ${missingFields.join(', ')}`, JSON.stringify(game, null, 2));
        return false;
    }

    // Allow games without start_time and end_time, but log a warning
    // if (game.start_time === null || game.end_time === null) {
    //     console.warn(`Game missing time information:`, JSON.stringify(game, null, 2));
    // }

    return true;
}

async function uploadGames(games) {
    const validGames = games.filter(validateGame);
    console.log(`Valid games to process: ${validGames.length}`);

    if (validGames.length !== games.length) {
        console.warn(`${games.length - validGames.length} games were invalid and will be skipped.`);
    }

    if (validGames.length === 0) {
        console.warn("No valid games to upload. Skipping upload process.");
        return;
    }

    const batchSize = 1000;
    for (let i = 0; i < validGames.length; i += batchSize) {
        const batch = validGames.slice(i, i + batchSize);

        console.log(`Processing batch ${i / batchSize + 1}`);
        console.log(`Sample game from batch:`, JSON.stringify(batch[0], null, 2));

        try {
            const { data, error } = await supabase
                .from('games')
                .upsert(batch, {
                    onConflict: 'sport_id,league_id,event_name',
                    ignoreDuplicates: false
                });

            if (error) {
                console.error(`Error processing batch ${i / batchSize + 1}:`, error);
                throw error;
            }

            console.log(`Successfully processed batch ${i / batchSize + 1}`);
        } catch (error) {
            console.error(`Error processing batch ${i / batchSize + 1}:`, error);
            console.error(`First game in problematic batch:`, JSON.stringify(batch[0], null, 2));
        }
    }
}

export async function POST() {
    try {
        const sportsData = await fetchSportsData();
        let totalProcessedGames = 0;

        for (const sport of sportsData) {
            let sportGames = [];

            for (const leagueId of sport.leagues) {
                console.log(`Fetching data for league ${leagueId} in sport ${sport.id}`);
                const { events } = await fetchScheduleData(leagueId);
                if (events && events.length > 0) {
                    console.log(`Found ${events.length} events for league ${leagueId}`);
                    const validEvents = events.filter(event => event.idLeague === leagueId.toString());
                    console.log(`${validEvents.length} events match the requested league ID`);
                    const mappedEvents = validEvents.map(event => {
                        try {
                            return mapEventToDbStructure(event, leagueId, sport.id);
                        } catch (error) {
                            console.error(`Error mapping event:`, JSON.stringify(event, null, 2));
                            console.error(`Error details:`, error);
                            return null;
                        }
                    }).filter(Boolean);
                    sportGames.push(...mappedEvents);
                } else {
                    console.log(`No events found for league ${leagueId}`);
                }
            }

            console.log(`Total games fetched for sport ${sport.id}: ${sportGames.length}`);

            if (sportGames.length > 0) {
                console.log(`Sample mapped game:`, JSON.stringify(sportGames[0], null, 2));
            }

            const groupedGames = sportGames.reduce((acc, game) => {
                const key = `${game.sport_id}-${game.league_id}-${game.event_name}`;
                if (!acc[key]) {
                    acc[key] = game;
                } else if (game.start_time && !acc[key].start_time) {
                    acc[key] = game;
                }
                return acc;
            }, {});

            const uniqueGames = Object.values(groupedGames);
            console.log(`Unique games to process for sport ${sport.id}: ${uniqueGames.length}`);

            await uploadGames(uniqueGames);
            totalProcessedGames += uniqueGames.length;

            console.log(`Finished processing sport ${sport.id}`);
        }

        return NextResponse.json({ message: 'Games fetched and processed', count: totalProcessedGames }, { status: 200 });
    } catch (error) {
        console.error('Error fetching or processing games:', error);
        return NextResponse.json({ error: 'Failed to fetch or process games' }, { status: 500 });
    }
}