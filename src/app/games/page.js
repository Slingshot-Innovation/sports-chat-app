'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from "@/utils/supabase/client"

export default function GameList() {
    const [sports, setSports] = useState([])
    const [groupedGames, setGroupedGames] = useState({})
    const [loading, setLoading] = useState(true)
    const supabase = createClient()
    const gamesPerPage = 5

    useEffect(() => {
        fetchSports()
    }, [])

    async function fetchSports() {
        const { data, error } = await supabase
            .from('sports')
            .select('id, name')
            .order('name')

        if (error) {
            console.error('Error fetching sports:', error)
            return
        }

        setSports(data)

        // Fetch initial games for each sport
        for (const sport of data) {
            await fetchGamesForSport(sport.id, sport.name)
        }
    }

    async function fetchGamesForSport(sportId, sportName, lastFetchedId = '') {
        setLoading(true)
        const query = supabase
            .from('games')
            .select('*')
            .eq('sport_id', sportId)
            .in('status', ['live', 'scheduled'])
            .order('start_time', { ascending: true })
            .limit(gamesPerPage)

        if (lastFetchedId) {
            query.gt('id', lastFetchedId)
        }

        const { data, error } = await query

        setLoading(false)

        if (error) {
            console.error(`Error fetching games for ${sportName}:`, error)
            return
        }
        if (data.length > 0) {
            setGroupedGames(prevGames => {
                const existingGames = prevGames[sportName] || []
                const newGames = data.filter(game => !existingGames.some(existingGame => existingGame.id === game.id))
                return {
                    ...prevGames,
                    [sportName]: [...existingGames, ...newGames]
                }
            })
        }
    }

    const formatDate = (dateString) => {
        if (!dateString) return 'Time TBD'
        const date = new Date(dateString)
        const options = {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        }
        return date.toLocaleString('en-US', options)
    }

    if (loading && Object.keys(groupedGames).length === 0) {
        return (
            <div className="p-5 bg-primary text-white h-full w-full flex items-center justify-center">
                <div>
                    <h1 className="text-accent text-3xl font-bold mb-4">All Games</h1>
                    <p className="text-gray-500">Loading games...</p>
                </div>
            </div>
        )
    }

    const sportsWithGames = sports.filter(sport => groupedGames[sport.name]?.length > 0)

    return (
        <div className="bg-primary text-white min-h-screen w-full flex flex-col overflow-auto">
            <h1 className="text-accent text-3xl font-bold p-5 text-center">All Games</h1>
            <div className="flex-grow overflow-auto p-5">
                <div className="w-full max-w-4xl mx-auto">
                    {sportsWithGames.map(sport => (
                        <div key={sport.id} className="mb-8">
                            <h2 className="text-secondary text-2xl font-semibold mb-4">{sport.name}</h2>
                            {groupedGames[sport.name] && groupedGames[sport.name].length > 0 ? (
                                <>
                                    <ul className="space-y-4">
                                        {groupedGames[sport.name].map(game => (
                                            <li key={game.id} className="p-4 bg-gray-800 rounded-md">
                                                <Link href={`/games/${game.id}`} className="flex items-center justify-between">
                                                    <div>
                                                        <div className="text-accent text-lg font-medium">
                                                            {game.event_name}
                                                        </div>
                                                        {game.status === 'scheduled' && (
                                                            <div className="text-sm text-gray-400">
                                                                {formatDate(game.start_time)}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className={`text-sm font-semibold ${game.status === 'live' ? 'text-green-500' :
                                                        game.status === 'scheduled' ? 'text-yellow-500' :
                                                            'text-red-500'
                                                        }`}>
                                                        {game.status === 'scheduled' ? 'Scheduled' :
                                                            game.status === 'live' ? 'Live' :
                                                                'Finished'}
                                                    </div>
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                    <button
                                        onClick={() => {
                                            const gamesForSport = groupedGames[sport.name] || [];
                                            const lastGame = gamesForSport[gamesForSport.length - 1];
                                            if (lastGame) {
                                                fetchGamesForSport(sport.id, sport.name, lastGame.id);
                                            }
                                        }}
                                        className={`${sport.name} mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors`}
                                    >
                                        Load more
                                    </button>
                                </>
                            ) : (
                                <p className="text-gray-500">No games available for this sport.</p>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}