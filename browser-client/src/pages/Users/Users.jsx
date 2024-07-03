import React from 'react'
import store from 'store'
import { Link } from 'react-router-dom'
import { useState,useEffect } from 'react'
const Users = () => {
  const [users,setUsers]=useState([])
  useEffect(()=>{
    setUsers(store.get('users'))
    console.log(store.get('users'))
  },[])
  return (

            <>
            {users.length?<div className="container">
            <div className="row">
              <div className="col">
              <ul className="list-group">
                {
                    users.map(user=>
                      <li key={user._id} style={{ height:'100%' }}  className=" user-li p-0 m-0 d-flex direction-row list-group-item height-100 ">

    <Link style={{ width:'100vw',minHeight:'100%' }}  className='p-3  user-link d-flex direction-row justify-content-evenly align-items-center flex-nowrap m-0 p-0 ' to={`/user/${user._id}`} >
    <h5>{user.firstName} {user.lastName}</h5>

    <div  className="profile-image-container">

<img  className='user-profile-image' draggable='false' 
    src={user._id?`http://localhost:1000/api/user-profile-image/${user.profileImage.imageName}?userId=${user._id}`:'*'}
    style={{
      top:`${user.profileImage.style.top/3}px`,
       transform:`scale(${user.profileImage.style.scale*6})`,objectFit:'contain',position:'relative'}}
       alt="user-profile-picture" />
</div>
        </Link></li>                    
                    
                    )
                }
</ul>
              </div>
            </div>
            </div>:null}
            </>
    )
}

export default Users