import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Subreddit from './pages/Subreddit'
import PostDetail from './pages/PostDetail'
import CreatePost from './pages/CreatePost'
import Analytics from './pages/Analytics'
import Login from './pages/Login'
import Register from './pages/Register'
import Search from './pages/Search'
import OAuthCallback from './pages/OAuthCallback'
import Profile from './pages/Profile'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="r/:name" element={<Subreddit />} />
        <Route path="post/:id" element={<PostDetail />} />
        <Route path="submit" element={<CreatePost />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="search" element={<Search />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="oauth/callback" element={<OAuthCallback />} />
        <Route path="u/:username" element={<Profile />} />
        <Route path="forgot-password" element={<ForgotPassword />} />
        <Route path="reset-password" element={<ResetPassword />} />
      </Route>
    </Routes>
  )
}

export default App

