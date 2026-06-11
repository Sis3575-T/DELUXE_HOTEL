import React from 'react'
import { backendUrl } from '../App'
const Login = () => {
  const {email, setEmail} = useState('')
  const {password, setPassword} = useState('')

  return (
    <div>
      <div>
        <div>
          <h1>Admin Login</h1>
          <form action="">
            <div>
              <p>Email Adress</p>
              <input type="email" name="" id="" placeholder='enter email' value={email} onChange={(e)=> setEmail(e.target.value)}/>
            </div>
            <div>
              <p>Password</p>
              <input type="password" name="" id="" placeholder='password' value={password} onChange={(e)=>setPassword(e.target.value)} />

            </div>
            <button>Login</button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default Login
