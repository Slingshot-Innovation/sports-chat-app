'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { createClient } from "@/utils/supabase/client"

export default function Sidebar() {
    const supabase = createClient()
    const [games, setGames] = useState({})
    const [openSports, setOpenSports] = useState({})

    useEffect(() => {
        fetchGames()
        // Set up a timer to fetch games every minute
        const timer = setInterval(fetchGames, 60000)
        return () => clearInterval(timer) // Clean up on unmount
    }, [])

    async function fetchGames() {
        const { data, error } = await supabase
            .from('games')
            .select(`
                *,
                sports (
                    id,
                    name
                )
            `)
            .eq('status', 'live')
            .order('start_time', { ascending: true })

        if (error) {
            console.error('Error fetching games:', error)
            return
        }

        if (data) {
            const groupedGames = data.reduce((acc, game) => {
                const sportName = game.sports?.name || 'Unknown Sport'
                if (!acc[sportName]) acc[sportName] = []
                acc[sportName].push(game)
                return acc
            }, {})
            setGames(groupedGames)
        }
    }

    const toggleSport = (sport) => {
        setOpenSports(prevState => ({
            ...prevState,
            [sport]: !prevState[sport]
        }))
    }

    return (
        <aside className="w-64 p-5 bg-primary text-white min-h-full">
            <Link href="/" className="text-accent mb-4 block">
                <h2 className="text-accent text-xl font-bold mb-4">Game Talk</h2>
            </Link>
            <h3 className="text-secondary text-md font-semibold mb-4 text-accent underline">Live Games</h3>
            {Object.entries(games).length === 0 ? (
                <p>No live games available.</p>
            ) : (
                Object.entries(games).map(([sport, sportGames]) => (
                    <div key={sport} className="mb-6">
                        <h3
                            className="text-secondary text-md font-semibold mb-1 cursor-pointer"
                            onClick={() => toggleSport(sport)}
                        >
                            {sport} ({sportGames.length})
                        </h3>
                        {openSports[sport] && (
                            <ul className="list-none">
                                {sportGames.map(game => (
                                    <li key={game.id} className="mb-[0.5]">
                                        <Link href={`/games/${game.id}`} className="text-sm text-accent underline">
                                            {game.event_name}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                ))
            )}
        </aside>
    )
}