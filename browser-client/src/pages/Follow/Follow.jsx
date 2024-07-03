import React from 'react'
import store from 'store'
import utilApi from '../../resources/api/util_requests'
import { useEffect,useState,useRef } from 'react'
import { useParams,Navigate } from 'react-router'
import { Link } from 'react-router-dom'
const Follow = () => {
  const params=useParams()
  const [followers,setFollowers]=useState([])
  const [followes,setFollowes]=useState([])
  useEffect(()=>{

    async function getFollowers (userId){
      const data= await utilApi.getFollowers(userId)
      setFollowers(data.followers)
    }
    async function getFollowes (userId){
      const data= await utilApi.getFollowes(userId)
      setFollowes(data.followes)
    }
    if(params.type=='followers')
    getFollowers(store.get('owner')._id)
    if(params.type=='followes')
    getFollowes(store.get('owner')._id)
},[])
console.log(followes)
  return (<>
       {(followers.length) ||(followes.length)?<div className="container">
 <h1>

  {`http://localhost:1000/api/user-profile-image/${followers[1].profileImage.imageName}?userId=${followers[1].id}` }
 </h1>
      <div className="row mt-4 d-flex direction-column justify-content-center align-items-center  ">
        <div className="col">
          <div className=''>
          <ul style={{ minWidth:'100vw',justifyContent:'start' ,paddingInline:'10px' }} className="  list-group list-group-flush d-flex ">
            {followers.length?followers.map((user,i)=>

            <li key={i} style={{ maxWidth:'400px',width:'100vw',justifyContent:'space-between' }} className=' border justify-content-space-between list-group-item d-flex  align-items-center'>
                <Link style={{ justifyContent:'space-between',maxWidth:'400px',width:'100vw' }} className='d-flex ' to={`./../../${user.id}`} >
              <p className='text-black'>
               {user.firstName} {user.lastName}
              </p>
              <div className="profile-image-container">

              <img className='user-profile-image' src={user.profileImage.imageName?`http://localhost:1000/api/user-profile-image/${user.profileImage.imageName}?userId=${user._id}`:'*'} alt="profile image" />
              </div>
            </Link>
              </li>
            ):followes.map((user,i)=>
              <li key={i} style={{ maxWidth:'400px',width:'100vw',justifyContent:'space-between' }} className=' border justify-content-space-between list-group-item d-flex  align-items-center'>
                <Link style={{ justifyContent:'space-between',maxWidth:'400px',width:'100vw' }} className='d-flex ' to={`./../../${user.id}`} >
                <p>
                 {user.firstName} {user.lastName}
                </p>
                <div className="profile-image-container">
  
                <img  className='user-profile-image' src={`http://localhost:1000/api/user-profile-image/${user.profileImage.imageName}?userId=${user.id}`} alt="profile image" />
                </div>
              </Link>
                </li>
            )}
          </ul>
          </div>
        </div>
      </div>
    </div>:null
}
      </>
)
}

export default Follow