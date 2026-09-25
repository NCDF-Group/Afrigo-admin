import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center p-6 text-center">
      <div>
        <p className="font-display text-6xl font-bold text-faint">404</p>
        <h1 className="mt-4 font-display text-xl font-bold">This page does not exist</h1>
        <Link href="/" className="mt-6 inline-flex h-10 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-fg">
          Back to overview
        </Link>
      </div>
    </main>
  )
}
