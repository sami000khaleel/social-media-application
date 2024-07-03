import store from 'store'
import Cookies from 'js-cookie'
import { useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router'
import userAPI from '../../resources/api/user_requests'
const Login=()=>{
const [user,setUser]=useState({})
const [loggerFlage,setLoggerFlage]=useState(false)
const navigate=useNavigate()
const [errMsg,setErrMsg]=useState('')
const [success,setSuccess]=useState(true)
function handleChange(e){
  setUser(pre=>{
    return {
      ...pre,[e.target.name]:e.target.value
    }
  })}
  async function handleClick(e){
const data=await userAPI.logUser(user.email,user.password)
if(!data.success){
setSuccess(false)
setErrMsg(data.err)
return 
}    
console.log('aaaaaaaa')
setSuccess(true)
store.set('user',data.user)
store.set('userId',data.user._id)
Cookies.set('token',`BEARER ${data.token}`)
navigate(`../user/${data.user._id}`)

  }
 
  return(

  <div className="container">
    <form className='shadow' >
    <h2>please fill up the form to log you in :</h2>

    <div className="form-group">
        <input onChange={handleChange} type="email" placeholder="email" required name="email" className="form-control" />
    </div>
    <div className="form-group">
      <input onChange={handleChange} type="password" className="form-control" name='password' placeholder="password" required />

    </div>
    <button onClick={handleClick} type='button' className="btn">submit</button>
    </form>
    {!success&&<h3 className=' m-3 email-error-p' >{errMsg}</h3>}
  </div>
  )
}
export default Login