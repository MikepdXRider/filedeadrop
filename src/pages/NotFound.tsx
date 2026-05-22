import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <main>
      <h1>404 — Not Found</h1>
      <Link to="/">Go home</Link>
    </main>
  )
}
