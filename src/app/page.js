'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from "@/utils/supabase/client"
import { PlusIcon } from '@heroicons/react/24/solid'

export default function Home() {
  const [games, setGames] = useState({ live: [], scheduled: [], finished: [] })
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [sports, setSports] = useState([])
  const [newGame, setNewGame] = useState({
    home_team: '',
    away_team: '',
    sport_id: '',
    start_time: '',
    end_time: ''
  })
  const supabase = createClient()

  useEffect(() => {
    fetchGames()
    fetchSports()
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

  async function fetchSports() {
    const { data, error } = await supabase
      .from('sports')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching sports:', error)
      return
    }

    setSports(data)
  }

  const renderGameList = (gameList, status) => {
    if (gameList.length === 0) {
      return <p className="text-gray-500">No {status} games at the moment.</p>
    }

    return (
      <ul className="list-disc list-inside">
        {gameList.map(game => (
          <li key={game.id} className="mb-1">
            <Link href={`/games/${game.id}`} className="text-accent hover:underline">
              {game.home_team} {game.away_team ? "vs" : ""} {game.away_team} {game.sports?.name ? "-" : ""} {game.sports?.name || 'Unknown Sport'}
            </Link>
          </li>
        ))}
      </ul>
    )
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setNewGame(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const formattedStartTime = new Date(newGame.start_time).toISOString()
    const formattedEndTime = new Date(newGame.end_time).toISOString()

    const { data, error } = await supabase
      .from('games')
      .insert([{
        home_team: newGame.home_team,
        away_team: newGame.away_team,
        sport_id: parseInt(newGame.sport_id),
        start_time: formattedStartTime,
        end_time: formattedEndTime,
        status: 'scheduled'
      }])

    if (error) {
      console.error('Error creating new game:', error)
    } else {
      setIsModalOpen(false)
      setNewGame({
        home_team: '',
        away_team: '',
        sport_id: '',
        start_time: '',
        end_time: ''
      })
      fetchGames()
    }
  }

  return (
    <div className="p-5 bg-primary text-white h-screen overflow-y-scroll w-full flex justify-center relative">
      <button
        onClick={() => setIsModalOpen(true)}
        className="absolute top-4 right-4 bg-accent text-white p-2 rounded-full hover:bg-accent-dark"
      >
        <PlusIcon className="h-6 w-6" />
      </button>

      <div className="w-full max-w-4xl">
        <h1 className="text-accent text-4xl font-bold mt-10 mb-8 text-center">Welcome to Game Talk</h1>

        <div className="text-center">
          <Link href="/games" className="text-accent text-lg font-medium hover:underline">View All Games</Link>
        </div>

        <div className="mb-8">
          <h2 className="text-secondary text-2xl font-semibold mb-4">Live Games</h2>
          {renderGameList(games.live, 'live')}
        </div>

        <div className="mb-8">
          <h2 className="text-secondary text-2xl font-semibold mb-4">Scheduled Games</h2>
          {renderGameList(games.scheduled, 'scheduled')}
        </div>

        <div className="mb-8">
          <h2 className="text-secondary text-2xl font-semibold mb-4">Finished Games</h2>
          {renderGameList(games.finished, 'finished')}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-8 rounded-lg w-96">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">Create New Game</h2>
            <form onSubmit={handleSubmit}>
              <input
                type="text"
                name="home_team"
                placeholder="Home Team"
                value={newGame.home_team}
                onChange={handleInputChange}
                className="w-full mb-2 p-2 border rounded text-gray-800"
                required
              />
              <input
                type="text"
                name="away_team"
                placeholder="Away Team"
                value={newGame.away_team}
                onChange={handleInputChange}
                className="w-full mb-2 p-2 border rounded text-gray-800"
                required
              />
              <select
                name="sport_id"
                value={newGame.sport_id}
                onChange={handleInputChange}
                className="w-full mb-2 p-2 border rounded text-gray-800"
                required
              >
                <option value="">Select a sport</option>
                {sports.map(sport => (
                  <option key={sport.id} value={sport.id}>
                    {sport.name}
                  </option>
                ))}
              </select>
              <input
                type="datetime-local"
                name="start_time"
                value={newGame.start_time}
                onChange={handleInputChange}
                className="w-full mb-2 p-2 border rounded text-gray-800"
                required
              />
              <input
                type="datetime-local"
                name="end_time"
                value={newGame.end_time}
                onChange={handleInputChange}
                className="w-full mb-2 p-2 border rounded text-gray-800"
                required
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="mr-2 px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-accent text-white rounded hover:bg-accent-dark"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}