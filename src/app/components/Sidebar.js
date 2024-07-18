'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { createClient } from "@/utils/supabase/client"

export default function Sidebar() {
    const supabase = createClient()
    const [games, setGames] = useState({})

    useEffect(() => {
        fetchGames()
    }, [])

    async function fetchGames() {
        const { data } = await supabase
            .from('games')
            .select('*')
            .eq('status', 'live')
        if (data) {
            const groupedGames = data.reduce((acc, game) => {
                if (!acc[game.sport]) acc[game.sport] = []
                acc[game.sport].push(game)
                return acc
            }, {})
            setGames(groupedGames)
        }
    }

    return (
        <aside className="w-64 p-5 bg-primary text-white">
            <h2 className="text-accent">Live Games</h2>
            {Object.entries(games).length === 0 ? (
                <p>No live games available.</p>
            ) : (
                Object.entries(games).map(([sport, sportGames]) => (
                    <div key={sport}>
                        <h3 className="text-secondary">{sport}</h3>
                        <ul>
                            {sportGames.map(game => (
                                <li key={game.id}>
                                    <Link href={`/games/${game.id}`} className="text-accent">
                                        {game.home_team} vs {game.away_team}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))
            )}
        </aside>
    )
}
