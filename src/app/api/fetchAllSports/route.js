import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fetchSportsData(strSport) {
    const { data, error } = await supabase
        .from('sports')
        .select('id, name, leagues')
        .eq('name', strSport);

    if (error) {
        console.error('Error fetching sports data:', error);
        throw error;
    }

    if (!data || !data[0] || !data[0].id) {
        console.error(`Sport not found: ${strSport}`);
        return 0;
    }

    console.log("Example of sports data", data[0]);
    return parseInt(data[0].id);
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

// jank but u get the idea
async function fetchScheduleData() {
    try {
        let today = new Date();
        let tomorrow = new Date(today);
        let theDayAfterTomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        theDayAfterTomorrow.setDate(theDayAfterTomorrow.getDate() + 2);
        let todayString = today.toISOString().split('T')[0];
        let tomorrowString = tomorrow.toISOString().split('T')[0];
        let theDayAfterTomorrowString = theDayAfterTomorrow.toISOString().split('T')[0];
        const todayData = await fetchWithRetry(`https://www.thesportsdb.com/api/v1/json/60130162/eventsday.php?d=${todayString}`);
        console.log("Example of today data", todayData.events[0]);
        const tomorrowData = await fetchWithRetry(`https://www.thesportsdb.com/api/v1/json/60130162/eventsday.php?d=${tomorrowString}`);
        const theDayAfterTomorrowData = await fetchWithRetry(`https://www.thesportsdb.com/api/v1/json/60130162/eventsday.php?d=${theDayAfterTomorrowString}`);
        //return all events together as they are sorted via db anyway
        return { events: todayData.events.concat(tomorrowData.events).concat(theDayAfterTomorrowData.events) };
    } catch (error) {
        console.error(`Unable to fetch data for today:`, error);
        return { events: [] };
    }
}

async function mapEventToDbStructure(event) {
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

    const sportId = await fetchSportsData(event.strSport);
    console.log("Sport ID", sportId);

    return {
        home_team: event.strHomeTeam || null,
        away_team: event.strAwayTeam || null,
        event_name: event.strEvent,
        start_time: startTime,
        end_time: endTime,
        status: ['Not Started', 'NS', 'Time to be defined', null].includes(event.strStatus) ? 'scheduled' : 'finished',
        created_at: new Date().toISOString(),
        sport_id: sportId,
        league_id: parseInt(event.idLeague)
    };
}

function validateGame(game) {
    const requiredFields = ['sport_id', 'event_name', 'status'];
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
                    onConflict: 'sport_id,event_name,start_time',
                    ignoreDuplicates: true
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
        let totalProcessedGames = 0;
        const { events } = await fetchScheduleData();
        for (const event of events) {
            const mappedEvent = await mapEventToDbStructure(event);
            await uploadGames([mappedEvent]);
            totalProcessedGames++;
        }

        return NextResponse.json({ message: 'Games fetched and processed', count: totalProcessedGames }, { status: 200 });
    } catch (error) {
        console.error('Error fetching or processing games:', error);
        return NextResponse.json({ error: 'Failed to fetch or process games' }, { status: 500 });
    }
}