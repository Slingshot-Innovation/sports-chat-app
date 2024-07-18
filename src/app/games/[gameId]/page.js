'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from "@/utils/supabase/client"

export default function ChatRoom({ params }) {
    const supabase = createClient()
    const [messages, setMessages] = useState([])
    const [newMessage, setNewMessage] = useState('')
    const [game, setGame] = useState(null)
    const { gameId } = params
    const messagesEndRef = useRef(null)

    useEffect(() => {
        fetchGame()
        fetchMessages()

        const channel = supabase
            .channel(`room:${gameId}`)
            .on('postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'messages', filter: `game_id=eq.${gameId}` },
                handleNewMessage
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log(`Subscribed to updates for game ${gameId}`)
                }
            })

        return () => {
            supabase.removeChannel(channel)
        }
    }, [gameId])

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    async function fetchGame() {
        const { data, error } = await supabase
            .from('games')
            .select('*')
            .eq('id', gameId)
            .single()

        if (error) {
            console.error('Error fetching game:', error)
            return
        }

        setGame(data)
    }

    async function fetchMessages() {
        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .eq('game_id', gameId)
            .order('created_at', { ascending: true })

        if (error) {
            console.error('Error fetching messages:', error)
            return
        }

        setMessages(data)
    }

    function handleNewMessage(payload) {
        setMessages(prevMessages => [...prevMessages, payload.new])
    }

    async function sendMessage(e) {
        e.preventDefault()
        if (!newMessage) return
        const { error } = await supabase
            .from('messages')
            .insert({ game_id: gameId, content: newMessage })

        if (error) {
            console.error('Error sending message:', error)
        } else {
            setNewMessage('')
        }
    }

    function scrollToBottom() {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    if (!game) {
        return <div>Loading...</div>
    }

    if (game.status === 'scheduled') {
        return (
            <div className="bg-primary text-white p-5 min-h-screen w-full flex flex-col items-center justify-center">
                <h1 className="text-accent">{game.home_team} vs {game.away_team}</h1>
                <p>This game hasn&apos;t started yet. Chat will be available when the game begins.</p>
            </div>
        )
    }

    if (game.status === 'finished') {
        return (
            <div className="bg-primary text-white p-5 min-h-screen w-full flex flex-col items-center justify-center">
                <h1 className="text-accent">{game.home_team} vs {game.away_team}</h1>
                <p>This game has ended. Chat is no longer available.</p>
                <div className="w-full max-w-xl">
                    {messages.map(message => (
                        <p key={message.id} className="bg-secondary p-2 rounded my-2">{message.content}</p>
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="bg-primary text-white min-h-screen max-h-screen w-full flex flex-col">
            <h1 className="text-accent text-center my-4">{game.home_team} vs {game.away_team}</h1>
            <div className="flex-1 w-full max-w-xl mx-auto mb-4 overflow-y-scroll">
                {messages.map(message => (
                    <p key={message.id} className="bg-dark p-2 rounded my-2">{message.content}</p>
                ))}
                <div ref={messagesEndRef} />
            </div>
            <form onSubmit={sendMessage} className="w-full max-w mx-auto flex gap-2 p-4 bg-gray-800">
                <input
                    type="text"
                    placeholder='Type a message...'
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    className="flex-1 p-2 rounded bg-gray-600 text-white"
                />
                <button type="submit" className="bg-accent text-primary p-2 rounded">Send</button>
            </form>
        </div>
    )
}
