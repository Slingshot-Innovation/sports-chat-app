'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from "@/utils/supabase/client"

export default function GameList() {
  const [groupedGames, setGroupedGames] = useState({})
  const supabase = createClient()

  useEffect(() => {
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

      if (error) {
        console.error('Error fetching games:', error)
        return
      }

      const grouped = data.reduce((acc, game) => {
        const sportName = game.sports?.name || 'Unknown Sport'
        if (!acc[sportName]) acc[sportName] = []
        acc[sportName].push(game)
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
          <h1 className="text-accent text-3xl font-bold mb-4">All Games</h1>
          <p className="text-gray-500">No games available at the moment.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-primary text-white h-screen w-full flex flex-col">
      <h1 className="text-accent text-3xl font-bold p-5 text-center">All Games</h1>
      <div className="flex-grow overflow-auto p-5">
        <div className="w-full max-w-4xl mx-auto">
          {Object.entries(groupedGames).map(([sport, sportGames]) => (
            <div key={sport} className="mb-8">
              <h2 className="text-secondary text-2xl font-semibold mb-4">{sport}</h2>
              <ul className="space-y-4">
                {sportGames.map(game => (
                  <li key={game.id} className="p-4 bg-gray-800 rounded-md">
                    <Link href={`/games/${game.id}`} className="flex items-center justify-between">
                      <div className="text-accent text-lg font-medium">
                        {game.home_team} {game.away_team ? "vs" : ""} {game.away_team}
                      </div>
                      <div className={`text-sm font-semibold ${
                        game.status === 'live' ? 'text-green-500' : 
                        game.status === 'scheduled' ? 'text-yellow-500' : 
                        'text-red-500'
                      }`}>
                        {game.status}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}