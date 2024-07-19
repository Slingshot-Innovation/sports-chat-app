'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from "@/utils/supabase/client"
import { v4 as uuidv4 } from 'uuid'
import { generateUsername } from '@/app/utils/usernameGenerator'

export default function ChatRoom({ params }) {
    const supabase = createClient()
    const [messages, setMessages] = useState([])
    const [newMessage, setNewMessage] = useState('')
    const [game, setGame] = useState(null)
    const { gameId } = params
    const messagesEndRef = useRef(null)
    const [userId, setUserId] = useState(null)
    const [username, setUsername] = useState(null)

    useEffect(() => {
        getOrCreateUser().then(() => {
            fetchGame()
            fetchMessages()
        })

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

    async function getOrCreateUser() {
        let id = localStorage.getItem('userId')
        let name = localStorage.getItem('username')
    
        if (!id || !name) {
            // If no user info in localStorage, create a new user
            id = uuidv4()
            name = generateUsername()
        }
    
        // Check if the user exists in the database
        const { data: existingUser, error: fetchError } = await supabase
            .from('users')
            .select('*')
            .eq('id', id)
            .single()
    
        if (fetchError && fetchError.code !== 'PGRST116') {
            console.error('Error fetching user:', fetchError)
            return
        }
    
        if (!existingUser) {
            // If user doesn't exist in the database, create them
            const { data: newUser, error: insertError } = await supabase
                .from('users')
                .insert({ id, username: name })
                .select()
                .single()
    
            if (insertError) {
                console.error('Error creating user:', insertError)
                return
            }
    
            // Update localStorage with the new user info
            localStorage.setItem('userId', id)
            localStorage.setItem('username', name)
        } else {
            // If user exists, update localStorage with the database info
            localStorage.setItem('userId', existingUser.id)
            localStorage.setItem('username', existingUser.username)
        }
    
        setUserId(id)
        setUsername(name)
    }
    
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
            .select(`
                *,
                users (
                    username
                )
            `)
            .eq('game_id', gameId)
            .order('created_at', { ascending: true })

        if (error) {
            console.error('Error fetching messages:', error)
            return
        }

        setMessages(data)
    }

    function handleNewMessage(payload) {
        fetchMessages() // Fetch all messages to ensure we have the latest data
    }

    async function sendMessage(e) {
        e.preventDefault()
        if (!newMessage) return
        
        // Ensure user exists before sending message
        await getOrCreateUser()
        
        if (!userId) {
            console.error('Failed to get or create user')
            return
        }
    
        const { error } = await supabase
            .from('messages')
            .insert({ game_id: gameId, content: newMessage, user_id: userId })
    
        if (error) {
            console.error('Error sending message:', error)
        } else {
            setNewMessage('')
        }
    }

    function scrollToBottom() {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    function generateColor(userId) {
        let hash = 0;
        for (let i = 0; i < userId.length; i++) {
            hash = userId.charCodeAt(i) + ((hash << 5) - hash);
        }
        const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
        return "#" + "00000".substring(0, 6 - c.length) + c;
    }

    if (!game || !username) {
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
                        <div key={message.id} className="flex items-center bg-dark p-2 rounded my-2">
                            <div 
                                className="w-3 h-3 rounded-full mr-2" 
                                style={{backgroundColor: generateColor(message.user_id)}}
                            ></div>
                            <span className="font-bold mr-2">{message.users.username}:</span>
                            <p>{message.content}</p>
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="bg-primary text-white min-h-screen max-h-screen w-full flex flex-col">
            <h1 className="text-accent text-center my-4">{game.home_team} {game.away_team ? "vs" : ""} {game.away_team}</h1>
            <div className="flex-1 w-full max-w-xl mx-auto mb-4 overflow-y-scroll">
                {messages.map(message => (
                    <div key={message.id} className="flex items-center bg-dark p-2 rounded my-2">
                        <div 
                            className="w-3 h-3 rounded-full mr-2" 
                            style={{backgroundColor: generateColor(message.user_id)}}
                        ></div>
                        <span className="font-bold mr-2">{message.users.username}:</span>
                        <p>{message.content}</p>
                    </div>
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