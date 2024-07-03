import React from 'react'
import axios from 'axios'
import userApi from '../../resources/api/user_requests.js'
import { Navigate, useNavigate } from 'react-router'
import { useRef,useEffect,useState } from 'react'
import store from 'store'
import Cookies from 'js-cookie'
const Signup = () => {
  const emailRef=useRef('')
  const [success,setSuccess]=useState(true)
  const [reqMsg,setReqMsg]=useState('')
  const navigate=useNavigate()
  const firstContainerRef=useRef('')
  const secondContainerRef=useRef('')
  const inpRef=useRef('')
  const [country, setCountry] = useState('')
  const [countryList,setCountryList]=useState([])
  const [showToggle,setShowToggle]=useState(false)
  const [countries,setCountries]=useState([])
  const [user,setUser]=useState({})
  const [nextPageFlage,setNextPageFlage] =useState(false)
  
  useEffect( ()=>
  async ()=>{
    
    try{
      
      const response= await axios.get('https://restcountries.com/v3.1/all')
if(response.status!==200)
console.log('no')
console.log('countries arrived')
const {data}=response
const temp=data.map(country=>{
  const {name:{common:name},flags:{png:flag}}=country
  return {name,flag}
})
setCountries(temp)

}catch(err)
{
  setReqMsg(err)
  setSuccess(false)
  
}
}
,[])

const handleChange=(e)=>{
  setUser(pre=>{return{...pre,[e.target.name]:e.target.value,[inpRef.current.name]:inpRef.current.value}})
}
const handleSubmit=async (e)=>{

  const res= await userApi.createUser(user)
  if(!res.success){
    setSuccess(false)
    setReqMsg(res.err)
    return 
  } 
  setSuccess(true)
  store.set('user',res.user)
  store.set('userId',res.user_id)
  Cookies.set('token',`BEARER ${res.token}`)
  navigate(`../user/${res.user._id}`)
  }



return (
  <>
  <div className="container ">
  <form >
<div 
ref={firstContainerRef}
onClick={(e)=>{
  if(!inpRef.current.contains(e.target))
  setShowToggle(false)
}} className="container  form-container">
    <div className="row">
<div className="col-sm-6 col-12 ">

    <div className="form-floating  m-3">
    <input onChange={handleChange} placeholder='first name' required type="text" className="form-control" name='firstName' id='first-name' />
    <label htmlFor="firstNname">first name</label>
    </div>
    <div className="form-floating m-3">

    <input onChange={handleChange} placeholder='last name' required type="text" className="form-control" name='lastName' id='lastName' />
    <label htmlFor="lastName">last name</label>
    </div>
    <div className="form-floating m-3">

    <input onChange={handleChange} placeholder='middle name'  type="text" className="form-control" name='middleName' id='middleName' />
    <label htmlFor="middleName">middle name</label>
    </div>
    <div className="form-floating m-3">

    <input onChange={handleChange} required placeholder='age'  type="number" className="form-control" name='age' id='age' />
    <label htmlFor="age">age</label>
    </div>
    <div  className="form-floating m-3">

    <input  onChange={handleChange} type="text" ref={inpRef}  className='form-control' name="country" id="country"
    onKeyUpCapture=
    {(e)=>{setShowToggle(true)
      setCountryList([])
      countries.forEach(country=>
        {
          if(country.name.slice(0,e.target.value.length).toLowerCase()===e.target.value.toLowerCase())
          
          setCountryList(pre=>[...pre,country])
          
        }
        )        
      }
    }  />

{
}
    {showToggle?(<>
    <div className="items-container"
    >
        {countryList.map((country,index)=>
        <button 
        onClick={()=>
          { setShowToggle((pre)=>!pre)
            inpRef.current.value=country.name
            setUser(((pre)=>{return{...pre,country:country.name}}))
          }}
          key={index} name='country' className='item-btn' 
          >
         <span>{country.name}</span> <img height='20' width='30' src={country.flag} alt="falg" />

      </button>)} 

    </div>
  
    </>):null}    
    <label htmlFor="country">country </label>
    </div>
            </div>
            <div className="col">

    <div className="form-floating m-3">
      <input onChange={handleChange} type="text" className='form-control' placeholder='city' name='city' id='city' />
      <label htmlFor="city">city</label>
    </div>
    <div className="form-floating m-3">
      <input onChange={handleChange} placeholder='street' className='form-control' type="text" name="street" id="street" />
      <label htmlFor="street">street</label>
    </div>
    
    <div className="form-floating m-3">
      <input onChange={handleChange} required placeholder='phone number' className='form-control' type="number" name="phoneNumber" id="phoneNumber" />
      <label htmlFor="phoneNumber">phone number</label>
    </div>
    
    <div className="form-floating m-3">
      <input onChange={handleChange} required placeholder='birth date' className='form-control' type="date" name="birthDate" id="birth-date" />
      <label htmlFor="birthDate">birth date</label>
           </div>
           <div onChange={handleChange} className="form-check-inline m-3">

<input onChange={handleChange} required type="radio" value='male' className='form-check-input radio-input' name="sex" id="male" />
 <label className='form-check-label' htmlFor="sex">male</label>          
           </div>
 
           <div className="form-check-inline m-3 ">

<input onChange={handleChange} required type="radio" value='female' className='form-check-input radio-input' name="sex" id="female" />
 <label className='form-check-label' htmlFor="sex">female</label>          
           </div>
 
            </div>
    </div>
 <div className="row">
  <div className="col ">
<button type='button' className='btn btn-primary m-3 ' onClick={()=>{setNextPageFlage(true) 
firstContainerRef.current.style.display='none'
secondContainerRef.current.style.display='block'
}}  >Next</button>
</div>
  </div>
  </div>
          {nextPageFlage?<><div ref={secondContainerRef} className=" container m-3">

            <div className="form-floating m-3">
              <input ref={emailRef} onChange={handleChange} type="email" className='form-control' placeholder='email' name="email" id="email" />
              <label htmlFor="email">email</label>
            </div>
            <div className="form-floating m-3">
              <input onChange={handleChange} type="password" className='form-control'  name="password" required minLength='8' placeholder='password' id="password" />
              <label htmlFor="password">password</label>
            </div>

    <button onClick={handleSubmit} type='button' className='btn btn-primary  m-3'>submit</button>
      <button type='button' onClick={()=>{
        console.log(firstContainerRef.current.style.display)
        secondContainerRef.current.style.display='none'
firstContainerRef.current.style.display='block'
}} className='btn-outline-primary btn ' >Back</button>  
   
          {!success&&<h3 className=' m-3 email-error-p' >{reqMsg}</h3>}
          </div>
          </>:null}
    </form>
    </div>
</>
    )
  }
  
  export default Signup