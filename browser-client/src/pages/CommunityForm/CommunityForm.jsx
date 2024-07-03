import Cookies from 'js-cookie'
import { useState,useRef, useEffect } from 'react'
import store from 'store'
import { useNavigate } from 'react-router'
import utilApi from '../../resources/api/util_requests'
import communityApi from '../../resources/api/community_requests'
const CommunityForm = () => {
    const[reqEnd,setReqEnd]=useState(false)
    const [users,setUsers]=useState([])
    const [user,setuUer]=useState(store.get('user'))
    const [selectedAdmins,setSelectedAdmins]=useState([])
    const [communityName,setCommunityName]=useState('')
    const [communityDescribtion,setCommunityDescribtion]=useState('')
    const [filteredUsers,setFilteredUsers]=useState([])
    const selectRef=useRef('')
    const navigate=useNavigate()
    function handleChange() {
    console.log('as')
}  

// const handleChooseAdmin=()=>{
    const optionsElements= selectRef.current.selectedOptions
    
// }
    const handleClick=(e)=>{
        setSelectedAdmins(pre=>[...pre,e.target.textContent])
    }
    useEffect(()=>{
        async function getUsers(){
            const data=await utilApi.getFollowers(user._id)
            setReqEnd(true)
            if(!data.success)
            return
            
            setUsers(data.followers)
            
        }
        getUsers()
    },[])
    function handleSearch(e){
        if(e.target.value==='')
       {

           setFilteredUsers([])
           return
        }
        // console.log(users[0])
        // console.log(`${users[0].firstName} ${users[0].lastName}`.slice(0,e.target.value.length))
    let filter1=[... users.filter(user=>e.target.value===`${user.firstName} ${user.lastName}`.toLowerCase().slice(0,e.target.value.length))]
    let filter2=filter1.filter(user=>!selectedAdmins.some(admin=>admin._id===user._id))
    setFilteredUsers(filter2)     
}
function handleSelect(user){
    setSelectedAdmins(pre=>[...pre,user])
    setFilteredUsers(pre=>[... pre.filter(filteredUser=>filteredUser._id!==user._id)])
}
function handleRemoveAdmin(admin){
    console.log('a')
setSelectedAdmins(pre=>pre.filter(user=>user._id!==admin._id))

}
async function handleCreateCommunity(e){
    e.preventDefault()
    let data=await communityApi.createCommunity(communityName,communityDescribtion,selectedAdmins)
   console.log('a')
    if(!data.success){
        console.log(data)
        return
    }
    let user=store.get('user')
    user.managedCommunities.push(data.community._id)
    console.log(user.managedCommunities,data.community._id)
    store.set('user',user)
    navigate(`../community/${data.community._id}`)
}
return (
      <>
      {reqEnd?
      <div style={{ background:'#ddd',height:'100vh' }} className="d-flex justify-content-center">

      <div style={{borderRadius:'30px',background:'white',width:'80%',minHeight:'80%'  }} className=" d-flex flex-column m-3 justify-content-between  align-items-center shadow  ">
      <form style={{ width:'80%' }} className='' >
    
        <div style={{width:'100%',maxWidth:'800px'}} className="form-floating  ">
        <input onChange={e=>setCommunityName(e.target.value)} placeholder='first name' required type="text" className="form-control" name='communityName' id='first-name' />
        <label htmlFor="communityName">community name</label>
        </div>
        <div style={{ marginBlock:'20px',width:'100%',maxWidth:'800px' }} className="form-floating ">
            
        <textarea style={{ minWidth:'' ,minHeight:'300px'}} onChange={e=>setCommunityDescribtion(e.target.value)} placeholder='community describtion'  type="text" className="form-control" name='communityDescribtion' id='communityDescribtion' />
        <label htmlFor="communityDescrbtion">community describtion</label>
        </div>
        <div style={{ width:'100%',maxWidth:"800px" }} className="form-floating">

        <input  onChange={handleSearch} placeholder='search followers'  type="text" className="form-control" name='searchFollowers' id='searchFollowers' />
        <label htmlFor="search followers">search followers</label>
        <div className="selected-admins-container">
            {selectedAdmins.map(admin=><div className='selected-admin-container'>{admin.firstName} <span onClick={()=>handleRemoveAdmin(admin)} className='cancel-admin' ><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-x" viewBox="0 0 16 16">
  <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
</svg></span> {admin.lastName}</div>)}
        </div>
        </div>
        <div style={{ display:filteredUsers.length?'block':'none' }} className="dropdown-menu">
        {filteredUsers.map(user=><p  onClick={()=>handleSelect(user)} style={{ cursor:'pointer' }} className=' dropdown-item'>{user.firstName} {user.lastName}</p>)}
</div>
<button onClick={(e)=>handleCreateCommunity(e)} className="btn">create community</button>
        </form>
        </div>
      </div>:'yet'
}
    </>
        )
      }
      

export default CommunityForm