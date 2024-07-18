'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from "@/utils/supabase/client"

export default function Home() {
  const [games, setGames] = useState({ live: [], scheduled: [], finished: [] })
  const supabase = createClient()

  useEffect(() => {
    async function fetchGames() {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .order('start_time', { ascending: true })

      if (error) {
        console.error('Error fetching games:', error)
        return
      }

      const grouped = data.reduce((acc, game) => {
        acc[game.status].push(game)
        return acc
      }, { live: [], scheduled: [], finished: [] })

      setGames(grouped)
    }

    fetchGames()
  }, [])

  const renderGameList = (gameList, status) => {
    if (gameList.length === 0) {
      return <p>No {status} games at the moment.</p>
    }

    return (
      <ul>
        {gameList.map(game => (
          <li key={game.id}>
            <Link href={`/games/${game.id}`} className="text-accent">
              {game.home_team} vs {game.away_team}
            </Link>
          </li>
        ))}
      </ul>
    )
  }

  return (
    <div className="p-5 bg-primary text-white min-h-screen w-full flex items-center justify-center">
      <div>
        <h1 className="text-accent">Welcome to Sports Chat</h1>
        
        <h2 className="text-secondary">Live Games</h2>
        {renderGameList(games.live, 'live')}
        
        <h2 className="text-secondary">Scheduled Games</h2>
        {renderGameList(games.scheduled, 'scheduled')}
        
        <h2 className="text-secondary">Finished Games</h2>
        {renderGameList(games.finished, 'finished')}
        
        <Link href="/games" className="text-accent">View All Games</Link>
      </div>
    </div>
  )
}
