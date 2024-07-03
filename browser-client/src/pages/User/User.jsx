// important scale the profile picture down by 1/3
import React from 'react'
import store from 'store'
import { Await, Link,useNavigate, useParams } from 'react-router-dom'
import EditImg from '../EditImg/EditImg.jsx'
import axios from 'axios'
import Cookies from 'js-cookie'
import '../../index.css'
import {Posts} from '../../components/index.js'
import {useEffect,useRef,useState} from 'react'
import userAPI from '../../resources/api/user_requests.js'
import MakePost from '../../components/MakePost/MakePost.jsx'
import utilApi from '../../resources/api/util_requests.js'
const User = () => {
  const [posts,setPosts ]=useState([])
  const [imageSrc,setImageSrc]=useState()
  const [errMsg,setErrMsg]=useState('')
  const [success,setSuccess]=useState(true)
  const [owner,setOwner]=useState({_id:'',profileImage:{imageName:'',style:{top:'',scale:''}},coverImage:{imageName:'',style:{top:'',scale:''}}})
  const [profileImageSrc,setProfileImageSrc]=useState()
  const [coverImageSrc,setCoverImageSrc]=useState()
  const [user,setUser]=useState({_id:null})
  const profilePictureUploadInputRef=useRef('')
  const profilePictureRef=useRef('')
  const [profilePictureEditigFlage,setProfilePictureEditingFlage]=useState(false)
  const [profilePictureMenuFlage,setProfilePictureMenuFlage]=useState(false)
  const [backgroundImageMenuFlage,setBackgroundImageMenuFlage]=useState(false)
  const [backgroundImageEditFlage,setBackgroundImageFlage]=useState(false)  
  const backgroundImageUploadRef =useRef('')
  const backgroundImageRef=useRef('')
  const navigate=useNavigate()   
  const params=useParams()
  const [ownerFlage,setOwnerFlage]=useState(false)
  // first check if the account belongs to the same user
  useEffect(()=>{
    setUser(store.get('user'))
    if((!Cookies.get('token'))||(!store.get('user'))){
      navigate('../../login')
      
    }
    setUser(store.get('user'))
    },[])
  useEffect(()=>{
    async function checkUser(){
        let {user}=await userAPI.getUser(params.id)
        let {posts}=await userAPI.getUserPosts(params.id)
        console.log(posts)
          setPosts(posts)
       console.log(user)
      setOwnerFlage(false)
       if(params.id===store.get('user')._id)
        setOwnerFlage(true)
        setOwner(user)
        store.set('owner',user)
      }
      
      checkUser()
      
  },[params.id])
  useEffect(()=>{
    
    if(!owner._id)
    {
      setSuccess(false)
      setErrMsg('no user was found')
      return 
    }
    if(owner._id){
      if(owner.coverImage)
      setCoverImageSrc(`http://localhost:1000/api/user-cover-image/${owner.coverImage.imageName}?userId=${owner._id}`)
      if(owner.profileImage)
      setProfileImageSrc(`http://localhost:1000/api/user-profile-image/${owner.profileImage.imageName}?userId=${owner._id}`)
    }
},[owner])
    const handleImgUpload=(inputRef,imageType)=>{
      const [file]=inputRef.current.files
      const imageSrc=URL.createObjectURL(file).split('/')[3]

      // pass type of image to the Edit image component
      // console.log(inputRef.current.attributes.for)
      store.set('image-name',file.name)
      console.log(store.get('image-name'))
      store.set('type',imageType)
      navigate(`/edit-image/${imageSrc}`)
    }
  async  function handleFollow(){
      const data=await userAPI.follow(owner._id)
      if(!data.success)
      {
        setErrMsg('could not follow')
        return 
      }
      console.log(data.followes)
      setOwner(data.followes)
    }
    const updateUser=(updatedUser)=>{
      console.log(updatedUser)
      setUser(updatedUser)
      if(updatedUser._id===owner._id)
      setOwner(updatedUser)
      store.set('user',updatedUser)

    }
    async function handleViewFollowes(){
      const data=await utilApi.getFollowes(owner._id)
      if(!data.success)
      console.log('no no')
      store.set('users',data.followes)
      navigate('/users')
      
    }
    async function handleViewFollowers(){
      const data=await utilApi.getFollowers(owner._id)
      if(!data.success)
      console.log('no no')
      store.set('users',data.followers)
      navigate('/users')

    }
return (
<>
{
user._id&&owner._id&&<div className="container container-fluid ">
<div className="row">
  <div className="col">
<div className="images-holder">
  <div className="background-image-container">

<img  draggable='false' ref={backgroundImageRef}
     src={owner._id?coverImageSrc:'*'}
     style={owner.coverImage&&{ transform:`scale(${owner.coverImage.style.scale})`,position:'relative' ,top:`${owner.coverImage.style.top}px`}} 
     alt='background-image' />
     </div>
    <div   className='update-background-container  '>
   <button style={{ display:!ownerFlage&&'none' }} onClick={()=>setBackgroundImageMenuFlage(pre=>!pre)} className='btn-background' ><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-camera" viewBox="0 0 16 16">
  <path d="M15 12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h1.172a3 3 0 0 0 2.12-.879l.83-.828A1 1 0 0 1 6.827 3h2.344a1 1 0 0 1 .707.293l.828.828A3 3 0 0 0 12.828 5H14a1 1 0 0 1 1 1v6zM2 4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-1.172a2 2 0 0 1-1.414-.586l-.828-.828A2 2 0 0 0 9.172 2H6.828a2 2 0 0 0-1.414.586l-.828.828A2 2 0 0 1 3.172 4H2z"/>
  <path d="M8 11a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5zm0 1a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM3 6.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0z"/>
</svg></button>
  <div className={`background-menu  `} style={{ display:!backgroundImageMenuFlage&&'none'}} >
    <label className='upload-image' htmlFor="background">

    <input for='background-image' accept='image/*'   onChange={(e)=>handleImgUpload(backgroundImageUploadRef,'background-image')} 
    ref={backgroundImageUploadRef}  placeholder='upload' className='upload-background'  
    type="file" name="background" id="background" />
    upload
    </label>
   </div>

  </div>
   
   
<div  className="profile-picture-container">
  <div  className="profile-image-container">

  <img  className='user-profile-image' draggable='false' ref={profilePictureRef}
      src={owner._id?profileImageSrc:'*'}
      style={{
        top:`${owner.profileImage.style.top/3}px`,
         transform:`scale(${owner.profileImage.style.scale*6})`,objectFit:'contain',position:'relative'}}
         alt="user-profile-picture" />
  </div>
  <div className={`profile-picture-options-container `}>
    <button style={{ display:!ownerFlage&&'none' }} onClick={e=>setProfilePictureMenuFlage(pre=>!pre)}  type='button' className='profile-picture-update-button'>
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-camera" viewBox="0 0 16 16">
      <path d="M15 12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h1.172a3 3 0 0 0 2.12-.879l.83-.828A1 1 0 0 1 6.827 3h2.344a1 1 0 0 1 .707.293l.828.828A3 3 0 0 0 12.828 5H14a1 1 0 0 1 1 1v6zM2 4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-1.172a2 2 0 0 1-1.414-.586l-.828-.828A2 2 0 0 0 9.172 2H6.828a2 2 0 0 0-1.414.586l-.828.828A2 2 0 0 1 3.172 4H2z"/>
  <path d="M8 11a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5zm0 1a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM3 6.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0z"/>
</svg>
    </button >
      <div className={`profile-picture-update-menu-container `}style={{ display:!profilePictureMenuFlage&&'none'}}>
    <label htmlFor="update-profile-picture">
        <input for='profile-image' ref={profilePictureUploadInputRef}   onChange={(e)=>handleImgUpload(profilePictureUploadInputRef,'profile-image')} accept='image/*' placeholder='upload' type='file' name='update-profile-picture' id='update-profile-picture' className=' profile-picture-update-menu-item '/>
         upload
    </label>
      </div>
  </div>
</div>
</div>
</div>
  </div>
  <div className="row">
    <div className="col">
      <div style={{ minWidth:'70vw' }} className="  d-flex align-items-end justify-content-center flex-column ">
      <h1 className='user-name text-xxl'>{owner.firstName} {owner.lastName}</h1>
     <div  className=" mt-3 d-flex flex-row justify-content-between align-items-center">
      <div  style={{ width:'50vw' }} className="border border-3">
        <Link onClick={handleViewFollowers} >
        <p>{`follwers : ${owner._id&&owner.followers.length}`}</p>
        </Link>
        <Link onClick={handleViewFollowes} >
        <p>{`followes : ${owner._id&&owner.followes.length}`}</p>
        </Link>
      </div>
      {!ownerFlage&&<button onClick={handleFollow} className="btn-primary btn">{owner.followers.some(followerId=>followerId===store.get('user')._id)?'unfollow':'follow'}</button>}
      </div>   
        
     
      </div>
        <h2 className='mt-3'>make a post now</h2>
        {params.id===store.get('user')._id&&<MakePost updateUser={updateUser} />}
      <div style={{ width:'100vw',backgroundColor:'rgba(0,0,0,0.03)' }} className='mt-5'>

        <h1>{ownerFlage?'your posts':'posts'}</h1>
  {posts.length?<Posts user={user} posts={posts} />:null}

      </div>
    </div>
  </div>
</div>
}
</>
    )
}

export default User