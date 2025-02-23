// src/app/page.tsx
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'

export default function Home() {
  return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8">
        <main className="max-w-4xl w-full">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">Queen's Blood</h1>
            <p className="text-lg text-muted-foreground">
              A strategic card placement game
            </p>
          </div>

          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Start Playing</CardTitle>
                <CardDescription>
                  Choose your mode to begin the game
                </CardDescription>
              </CardHeader>
              <CardContent className="flex gap-4">
                <Link href="/game">
                  <Button size="lg">
                    Start New Game
                  </Button>
                </Link>
                <Button variant="outline" size="lg">
                  Practice Mode
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>How to Play</CardTitle>
                <CardDescription>
                  Learn the rules and strategies
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Place cards strategically on a 3x5 grid</li>
                  <li>Each card has a power value</li>
                  <li>Score the most points by placing cards strategically</li>
                  <li>Cards must be placed adjacent to your existing cards</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
  )
}
