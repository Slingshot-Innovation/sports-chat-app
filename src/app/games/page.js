'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from "@/utils/supabase/client"

export default function GameList() {
  const [groupedGames, setGroupedGames] = useState({})
  const supabase = createClient()

  useEffect(() => {
    async function fetchGames() {
      const { data, error } = await supabase.from('games').select('*')
      
      if (error) {
        console.error('Error fetching games:', error)
        return
      }

      const grouped = data.reduce((acc, game) => {
        if (!acc[game.sport]) acc[game.sport] = []
        acc[game.sport].push(game)
        return acc
      }, {})

      setGroupedGames(grouped)
    }

    fetchGames()
  }, [])

  if (Object.keys(groupedGames).length === 0) {
    return (
      <div className="p-5 bg-primary text-white h-full flex items-center justify-center">
        <div>
          <h1 className="text-accent">All Games</h1>
          <p>No games available at the moment.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-5 bg-primary text-white h-full w-full flex items-center justify-center">
      <div>
        <h1 className="text-accent">All Games</h1>
        {Object.entries(groupedGames).map(([sport, sportGames]) => (
          <div key={sport}>
            <h2 className="text-secondary">{sport}</h2>
            <ul>
              {sportGames.map(game => (
                <li key={game.id}>
                  <Link href={`/games/${game.id}`} className="text-accent">
                    {game.home_team} vs {game.away_team} - {game.status}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
