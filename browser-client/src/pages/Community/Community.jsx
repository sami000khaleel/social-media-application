import store from "store"
import { Link } from 'react-router-dom';
import {Posts} from "../../components/index";
import {MakePost} from '../../components/index'
import { useNavigate } from "react-router"
import communityApi from "../../resources/api/community_requests"
import { useEffect,useState,useRef } from "react"
import { Await, useParams } from "react-router"
import userApi from '../../resources/api/user_requests'
const Community = () => {
  const params=useParams()
  const [managerFlage,setManagerFlage]=useState(()=>store.get('user').managedCommunities.some(id=>id===params.communityId))
  const [imgSrc,setImgSrc]=useState('')
  const [roleListflage,setRoleListFlage]=useState(false)
  const backgroundImageUploadRef=useRef('')
  const [backgroundImageMenuFlage,setBackgroundImageMenuFlage]=useState(false)
  const [user,setUser]=useState(store.get('user'))
 const [community,setCommunity]=useState({_id:''})
 const [admins,setAdmins]=useState([])
 const navigate=useNavigate()
 useEffect(()=>{
  async function getCommunity(){
    const data1=await communityApi.getCommunity(params.communityId)
    if(!data1.success)
       console.log('a')
    const data2=await communityApi.getPosts(data1.community.id)
    if(!data2.success)
       console.log('a')
    setCommunity({...data1.community,posts:data2.posts})
  }
  getCommunity()
  userApi.getUser(store.get('user')._id).then(data=>setUser(data.user)).catch(err=>console.log(err))
 },[]) 
 const handleImgUpload=async (e)=>{
  const file = e.target.files[0]
    const reader = new FileReader()
    reader.onload=()=>{setImgSrc(reader.result)}
    reader.readAsDataURL(file)
 const data=await communityApi.updateImage(community._id,file)
setCommunity(pre=>({...pre,coverImageName:data.coverImageName}))
setImgSrc(`http://localhost:1000/api/community/image/${data.coverImageName}?communityId=${community._id}`)
}
useEffect(()=>{
  if(community.coverImageName){
setImgSrc(`http://localhost:1000/api/community/image/${community.coverImageName}?communityId=${community._id}`)

  }
  },[community])
 async function handleReqJoin(){
  let data
  if(community.public){
    if(community.members.every(({memberId})=>memberId._id!==store.get('user')._id))
    data=await communityApi.memberJoin(community._id)
    if(community.members.some(({memberId})=>memberId._id===store.get('user')._id))
    data=await communityApi.removeMember(community._id)
  }
  if(!community.public){

    if(community.waitingList.every(({userId})=>userId!==store.get('user')._id))
    data =await communityApi.reqJoin(community._id)    
    if(community.waitingList.some(({userId})=>userId===store.get('user')._id))
    data=await communityApi.userRemoveReq(community._id,store.get('user')._id)
  }
  if(!data.success)
      return
  setCommunity(data.community)
  userApi.getUser(store.get('user')._id).then(data=>setUser(data.user)).catch(err=>console.log(err))


 }
 console.log(community)
 function userAction(){
  if(!community.public){

    if(community.waitingList.some(({userId})=>userId===store.get('user')._id))
    return'remove join request'
    if(community.waitingList.every(({userId})=>userId!==store.get('user')._id))
    return 'send join request'
  }
   if(community.public){

     if(community.members.every(({memberId})=>memberId._id!==store.get('user')._id))
     return 'join community'
     if(community.members.some(({memberId})=>memberId._id===store.get('user')._id))
     return 'leave community'
    }   
}console.log(community)
 return (
    community._id?<div className="community-container">
        {/* <button onClick={()=>navigate(`/manage-community/${community._id}`)} className=" btn-primary btn manager-btn">manage</button> */}
        <div className="community-header">
        <div className="community-cover-image-container">

<img  draggable='false' 
     src={imgSrc||'*'}
  className="community-cover-image"
alt='background-image' />
    <div   className='community-cover-btn  '>
   <button style={{ display:user.managedCommunities.some(id=>id===community._id)?'block':'none' }} onClick={()=>setBackgroundImageMenuFlage(pre=>!pre)} className='btn-background' ><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-camera" viewBox="0 0 16 16">
  <path d="M15 12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h1.172a3 3 0 0 0 2.12-.879l.83-.828A1 1 0 0 1 6.827 3h2.344a1 1 0 0 1 .707.293l.828.828A3 3 0 0 0 12.828 5H14a1 1 0 0 1 1 1v6zM2 4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-1.172a2 2 0 0 1-1.414-.586l-.828-.828A2 2 0 0 0 9.172 2H6.828a2 2 0 0 0-1.414.586l-.828.828A2 2 0 0 1 3.172 4H2z"/>
  <path d="M8 11a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5zm0 1a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM3 6.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0z"/>
</svg></button>
  <div className={`background-menu  `} style={{ display:!backgroundImageMenuFlage&&'none'}} >
    <label className='upload-image' htmlFor="background">

    <input for='background-image' accept='image/*'   onChange={handleImgUpload} 
    ref={backgroundImageUploadRef}  placeholder='upload' className='upload-background'  
    type="file" name="background" id="background" />
    upload
    </label>
   </div>

  </div>
     </div>
  <section style={{ width:'80vw' }} className="introduction-container d-flex flex-row justify-content-between mt-3">
  <span>

  <h4 style={{ backgroundColor:'rgba(200,200,200,0.4)',borderRadius:'10px',height:'50px',padding:'10px',width:'100px',cursor:'pointer' }} onClick={()=>setRoleListFlage(pre=>!pre)}>runs by</h4>
  {roleListflage?<ul class="list-group">
  <Link to={`/user/${community.manager._id}`} >
  <li class="list-group-item d-flex justify-content-between align-items-center " style={{ minWidth:'220px' }}>

    
    <p>{`${community.manager.firstName} ${community.manager.lastName}`}</p> <p>manager</p> 
    </li>
  </Link>
  {community.admins.map(admin=>
  <Link to={`/user/${admin._id}`} >

  <li class="list-group-item d-flex justify-content-between align-items-center " style={{ minWidth:'220px' }}><p>{`${admin.firstName} ${admin.lastName}`}</p> <p>admin</p> </li>
  </Link>
)
}
</ul>:null}
  {community.manager._id!==user._id&&community.admins.every(admin=>admin._id!==user._id)&&<button onClick={handleReqJoin} style={{ marginLeft:'10px' }} className="p-3  btn-primary btn  " >{userAction()}</button>}
    </span>
  <section style={{ width:'40%' }} className="d-flex flex-column">
<span style={{  }} className="d-flex align-items-center  " >  <h3>{community.communityName}</h3> <p  style={{ whiteSpace:'nowrap',marginTop:'10px',marginLeft:'20px' }}>{`${community.members.length} members`}</p> </span>
  <p style={{ fontSize:'.8rem' }}>{community.describtion}</p>
  </section>
  </section>
        </div>
        <MakePost setCommunity={setCommunity} communityId={community._id} />
   <posts />
    </div>:null
    )
}

export default Community