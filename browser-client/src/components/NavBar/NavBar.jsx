import React from 'react'
import store from 'store';
import communityApi from '../../resources/api/community_requests';
import utilApi from '../../resources/api/util_requests';
import { useState,useRef,useEffect } from 'react'
import userAPI from '../../resources/api/user_requests';
import { Link, useParams } from 'react-router-dom';
import StickyBox from "react-sticky-box";
import {useLocation,NavLink,Outlet, useNavigate} from 'react-router-dom'
import Cookies from 'js-cookie'
import OverLay from '../Overlay/OverLay';
const NavBar = () => {
  const navigate=useNavigate()
  const [approveJoinFlage,setApproveJoinFlage]=useState(false)
  const [resignFlage,setResignFlage]=useState(false)
  const [removedAdmins,setRemovedAdmins]=useState([])
  const [chosenAdmins,setChosenAdmins]=useState([])
  const [addListFlage,setAddListFlage]=useState(false)
  const [removeListFlage,setRemoveListFlage]=useState(false)
  const [followers,setFollowers]=useState([])
  const [followes,setFollowes]=useState([])
  const [results,setResults]=useState([])
  const [searchQuery,setSearchQuery]=useState()
  const [dropListFlage,setDropListFlage]=useState(false)
  const [communityName,setCommunityName]=useState('')
  const [community,setCommunity]=useState({_id:''})
  const communityPublicityRef=useRef()
  const postApproval=useRef()
  let location=useLocation()
  let searchRef=useRef('')
  const params=useParams()
  
  useEffect(()=>{
    params.communityId&&communityApi.getCommunity(params.communityId).then(data1=>{
      let community=data1.community
      utilApi.getUsers(community.waitingList.map(({userId})=>userId)).then(data2=>{
        let items=community.waitingList
              for (let i = 0; i < items.length; i++) 
                    items[i].userId=data2.users[i]  
              setCommunity({... community,waitingList:items})
              
            }).catch(err=>console.log(err))

    }).catch(err=>console.log(err))
    
    
  },[location])

  async function handleSearch(e)
  {
    e.preventDefault()
    const results=await userAPI.searchQeury(searchQeury)
   
  }
  async function changePublicity(e){
    const data=await communityApi.changePublicity(params.communityId)
    setCommunity(data.community)
  }
  async function changePostApproval(e){
    
  console.log(e.target.checked)
    const data=await communityApi.changePostApproval(params.communityId)
    setCommunity(data.community)
   } 
 function handleClickMember(e,memberId){
  if(e.target.classList.contains('manager-item'))
  return 
    if(e.target.classList.contains('admin-item'))
       {
        if(removedAdmins.some(({_id})=>_id===memberId._id)){

          setRemovedAdmins(pre=>[... pre.filter((admin)=>admin._id!==memberId._id)])
               }
               
      else
        setRemovedAdmins(pre=>[... pre,memberId])
        e.target.classList.toggle('removed-admin-item')
        }
        if(!e.target.classList.contains('admin-item')&&!e.target.classList.contains('manager-item')){
          if(e.target.classList.contains('chosen-admin-item'))
                setChosenAdmins(pre=>[... pre.filter(({_id})=>_id!==memberId._id)])
          else
          setChosenAdmins(pre=>[... pre,memberId])
          e.target.classList.toggle('chosen-admin-item')
              }


}
async function handleConfrimUpdateAdmins(){
  let data
  if(chosenAdmins.length)
    data=await communityApi.addAdmins(community._id,chosenAdmins.map(admin=>admin))
    if(removedAdmins.length)
    data=await communityApi.removeAdmins(community._id,removedAdmins.map(admin=>admin))
  console.log(data)
    window.location.reload();

  }
  async function handleSwitchManager(admin){
    const data=await communityApi.switchManager(community._id,admin._id)
    window.location.reload()
  }
  async function handleRemoveGroup(e){
    e.preventDefault()
    const data=await communityApi.deleteCommunity(community._id)
    if(!data.success)
    return
    navigate(`/user/${community.manager._id}`)
  }
async function handleAcceptMember(member){
  let role
    if(community.manager._id===store.get('user')._id)
      role= 'manager'
    else
     role= 'admin'
  
  const data=await communityApi.roleApproveJoin(community._id,member._id,role)
  console.log(data)
  setCommunity(data.community)
}
async function handleRejectMember(member){
  let role
  if(community.manager._id===store.get('user')._id)
    role= 'manager'
  else
   role= 'admin'

const data=await communityApi.roleRemoveReq(community._id,member._id,role)
setCommunity(data.community)
}
return (<>
   
<h1>{results.length}</h1>
<StickyBox className='sticky-nav' style={{ top:'0px',zIndex:'99999999'}}  >


<nav className=" shadow navbar position-relative navbar-light bg-light">
  <div className="container-fluid">
    <button className="navbar-toggler " type="button" data-bs-toggle="collapse" data-bs-target="#navbarSupportedContent" aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
      <span className="navbar-toggler-icon"></span>
    </button>
    <div className="collapse navbar-collapse" id="navbarSupportedContent">
      <ul className="  navbar-nav me-auto mb-2 mb-lg-0">
        <li className="nav-item">
          <a  className="nav-link">

            <Link to='/' >Home</Link>
          </a>
        </li>
        <li className="nav-item">
        <a  className="nav-link">
          <Link to={`/user/${store.get('userId')}`} >your page</Link>
        </a>
        </li>
        <li className="nav-item">
          <a className="nav-link">

            <Link to={'/logout'} >log out</Link>
          </a>
                  </li>
         <hr />
         <li style={{ maxWidth:'300px' }} onClick={()=>setDropListFlage(pre=>!pre)} className='nav-link font-weight-bold'>communities</li>
         {dropListFlage&&<ul style={{ maxWidth:'300px' }} class="list-group">
  <li class="list-group-item">A fourth item</li>
  <li class="list-group-item">And a fifth one</li>
  <hr />
  <li onClick={()=>navigate('/create-community')} class="list-group-item">create community</li>
</ul>}
                  
      </ul>
      <hr />
      {community._id&&store.get('user').managedCommunities.some(id=>id===params.communityId)?<><div className="mt-4 d-flex flex-row flex-wrap justify-content-evenly community-options">
            <div className="dropdown position-relative">

                <button onClick={()=>setAddListFlage(pre=>!pre)} className='btn m-1 btn-primary m-0'>update admins</button>
                {addListFlage?<div style={{zIndex:'99999999999999999' ,background:'white',top:'30px',left:'0',width:'',height:'' }} className=" position-absolute " aria-labelledby="dropdownMenuButton">
                <ul style={{ width:'100%' }} className="list-group position-relative ">
                  <button style={{ bottom:'-60%',right:'-50%' }} onClick={handleConfrimUpdateAdmins} className='btn btn-primary position-absolute' > confirm </button>
            {community.members.map(({memberId})=><li  onClick={(e)=>handleClickMember(e,memberId)}
               style={{ width:'100%'}} 
               className={` list-group-item ${community.manager._id===memberId._id&&'manager-item'} ${community.admins.some(({_id})=>_id===memberId._id)&&'admin-item'} 
            ${chosenAdmins.some(id=>id===memberId._id)&&'chosen-admin-item'} ${removedAdmins.some(({_id})=>_id===memberId._id)&&'removed-admin-item'}`}>
                   {`${memberId.firstName} ${memberId.lastName}`}
            </li>)}
</ul>
  </div>:null}
            </div>
              <span className='position-relative' >

                <button style={{ overflow:'visible' }} onClick={()=>setResignFlage(pre=>!pre)} className=' position-relative btn m-1 btn-warning m-0'>resign
                </button>
                {resignFlage&&<ul style={{ minWidth:'220px',top:'40px',zIndex:'9999999' }} className="list-group position-absolute  ">
  <h5  className='m-1 p-1' style={{ background:'rgba(0,255,0,0.5)' }} >chose the new manager</h5>
          {community.admins.map(admin=><li onClick={handleSwitchManager} className='list-group-item chose-admin-item' >{admin.firstName} {admin.lastName}</li>)}
</ul> }
              </span>
              
                <button onClick={handleRemoveGroup} className='btn m-1 btn-danger m-0'>remove group</button>
            
              </div>
      <div style={{ marginLeft:'' }} className="mt-4 d-flex flex-row flex-wrap justify-content-start community-options">
      <div   className="form-check form-switch">
  <input style={{  }} checked={community.public} onChange={changePublicity} className="form-check-input" type="checkbox" role="switch" id="communityPublicity"/>
  <label className="form-check-label"  htmlFor="communityPublicity">community publicity</label>
</div>
              </div>
      <div style={{ marginLeft:'' }} className="mt-4 d-flex flex-row flex-wrap justify-content-start community-options">
      <div   className="form-check form-switch">
  <input style={{  }}  className="form-check-input" onChange={changePostApproval} type="checkbox" checked={community.postApproval} role="switch" id="postApproval"/>
  <label className="form-check-label" htmlFor="postApproval">post approval</label>
</div>
              </div>
              </>:null}
              <hr />
            { community._id&&!community.public&&(community.admins.some(admin=>admin._id===store.get('user')._id)||community.manager._id)===store.get('user')._id&& <div className="d-flex flex-row justify-content-evenly">
                
              <span className='position-relative' >
                  <button onClick={()=>setApproveJoinFlage(pre=>!pre)} className="btn btn-success  ">approve join requests</button>
                {approveJoinFlage&&<ul style={{ zIndex:'999999',left:'60px',bottom:'-30px' }} className="list-group position-absolute">
       {community.waitingList.map(({userId})=> <li style={{ minWidth:'200px' }} className='d-flex justify-content-between align-items-center list-group-item' > <Link  to={`user/${userId._id}`} ><p>{userId.firstName} {userId.lastName}</p> </Link><span className='d-flex justify-content-between'><span onClick={()=>handleAcceptMember(userId)} className='accept-member'></span><span onClick={()=>handleRejectMember(userId)} className='reject-member' ></span></span></li>)}
       </ul>}
               </span>

                <button onClick={()=>navigate(`waiting-posts/${community._id}`)} className="btn btn-success ">approve posts</button>
              </div>}
      <form style={{}} className="d-flex position-relative">
        <input ref={searchRef} onChange={(e)=>{setSearchQuery(e.target.value)
        if(e.target.value==='')
        setResults([])
        if(e.target.value){
          
          let users=store.get('users')
          if(users.length){
            users=users.filter(user=>{
              let fullName=`${user.firstName} ${user.lastName}`
              if(fullName.includes(e.target.value))
              return true
            })
          }
          let communities=store.get('communities').length||[]
          if(communities.length){

            communities= communities.filter(community=>community.communityName.includes(e.target.value))

          }
          setResults({users:[... users],communities:[... communities]})
          console.log(results)
        }
        
        }} className="form-control me-2" type="search" placeholder="Search" id='searcgQuery' aria-label="Search"/>

        <button onClick={async(e)=>  {
          e.preventDefault()
          const data= await userAPI.searchQuery(searchQuery)
          console.log(data) 
          setResults(data.results)
}} className="btn btn-outline-success" type="submit">Search</button>

        {Object.keys(results).length?<div onClick={()=>{setResults({})
      searchRef.current.value=''
      }} style={{ top:'90px',minWidth:'200px',width:'30vw',maxWidth:'400px' }} className="list-container position-absolute  left-0">
          <ul style={{ overflow:'visible' }} className='list-group positoin-absolute' >
              <>
              <>
            { results.users.length&&<li  className='list-group-item'>
                        <h2 style={{ color:'steelblue' }}>users</h2>

                    </li>}
              {

                results.users.map((user,i)=>{
                  return  <li key={i} className='list-group-item'>
                        <a href="#" className=" text-dark list-group-item list-group-item-action">
                            <Link to={`user/${user.id}`} >
                               <h4 className='text-dark'>
                                 {user.firstName}  {user.lastName}
                               </h4>
                            </Link>
                        </a>

                    </li>
                    
                  })
                }
              </>                
              <>
              {results.communities.length&&<li  className='list-group-item'>

              <h2 style={{ color:'steelblue' }}>communities</h2>
             </li>}
              {
                
                results.communities
                .map((community,i)=>{
                  return  <li key={i} className='list-group-item'>
                        <a href="#" className=" text-dark list-group-item list-group-item-action">
                            <Link to={`community/${community._id}`} >
                               <h4 className='text-dark'>
                                 {community.communityName}
                               </h4>
                            </Link>
                        </a>

                    </li>
                    
                  })
              }
              </>  
              </>
          </ul>

        </div>:null}
      </form>
    </div>
              
  </div>
</nav>


    </StickyBox>
<Outlet/>

</>
    )
}

export default NavBar