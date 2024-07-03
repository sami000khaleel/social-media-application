import React from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import './user.css'
import wallpaper from '../../../resources/sami.jpg'
import {useEffect,useRef,useState} from 'react'
const User = () => {
  const profilePictureUploadInputRef=useRef('')
  const profilePictureRef=useRef('')
  const [scaleFlage,setScaleFlage]=useState(false)
  const [dropDownBackground,setDropDownBackground]=useState(true)
  const [backgroundScale,setBackgroundScale]=useState(1)
  const [backgroundAccept,setBackgroundAccept]=useState(false)
  const [clickPos,setClickPos]=useState([])
  const [currentPos,setCurrentPos]=useState({})
  const [preOffset,setPreOffset]=useState({x:0,y:0})
  const intervalRef=useRef('')
  const [uploadingBackground,setUploadingBackground]=useState(false)
  const [editBackground,setEditBackground]=useState(false)
  const backgroundRef=useRef('')
  const imgRef=useRef('')
  const backgroundMenu1=useRef('')
  const [backgroundMenu,setBackgroundMenu]=useState(false)
  const [user, setUser] = useState({})
  const [profilePictureMenuFlage,setProfilePictureMenuFlage]=useState(false)
  const[profilePictureEditigFlage,setProfilePictureEditingFlage]=useState(false)
  const handleMouseUpdate=(e)=>{
    if(editBackground){
    if(backgroundRef.current.clicking){
     setCurrentPos({x:e.pageX- clickPos.x+preOffset.x,y:e.pageY- clickPos.y+preOffset.y})
    backgroundRef.current.style.left=`${currentPos.x}px`
    backgroundRef.current.style.top=`${currentPos.y}px`
  }}
  if(profilePictureEditigFlage){
    if(profilePictureRef.current.clicking){
      setCurrentPos({x:e.pageX- clickPos.x+preOffset.x,y:e.pageY- clickPos.y+preOffset.y})
     profilePictureRef.current.style.left=`${currentPos.x}px`
     profilePictureRef.current.style.top=`${currentPos.y}px`
  }
}
  }
  function handleMouseUp(e) {
    if(profilePictureEditigFlage) {
      profilePictureRef.current.style.cursor='grab'
      setClickPos({x:e.pageX,y:e.target.pageY})
      const offsetx=profilePictureRef.current.style.left.split('px')[0]
      const offsety=profilePictureRef.current.style.top.split('px')[0]
      setPreOffset({x:currentPos.x,y:currentPos.y})}

    if(editBackground){
    backgroundRef.current.style.cursor='grab'
    backgroundRef.current.clicking=false
   setClickPos({x:e.pageX,y:e.target.pageY})
   const offsetx=backgroundRef.current.style.left.split('px')[0]
   const offsety=backgroundRef.current.style.top.split('px')[0]
  setPreOffset({x:currentPos.x,y:currentPos.y})}
    }
  function handleMouseDown(e){
    console.log('ss')
    if(profilePictureEditigFlage){
      console.log('a')
      profilePictureRef.current.clicking=true
   
      profilePictureRef.current.style.cursor='grabbing'
    e.preventDefault()
    profilePictureRef.current.clicking=true
    setClickPos({x:e.pageX,y:e.pageY})
    }
    if(editBackground){ 

    backgroundRef.current.style.cursor='grabbing'
    e.preventDefault()
    backgroundRef.current.clicking=true
    setClickPos({x:e.pageX,y:e.pageY})
  }
return
}
    function handleImgUpload(e){ 
      backgroundRef.current.style.cursor='grab'
      setScaleFlage(true)
      setDropDownBackground(false)
      setEditBackground(true)
      setUploadingBackground(true)
      const [file]=backgroundMenu1.current.files
    if(file)
    backgroundRef.current.src=URL.createObjectURL(file)

  }
const handlebackgroundConfirm=(e)=>{
  setScaleFlage(false)
  setBackgroundMenu(false)
  setDropDownBackground(true)
  setEditBackground(false)
  setBackgroundAccept(true)
  backgroundRef.current.style.cursor='auto'
  //call post method
}
const handleCancelBackground=(e)=>{
  setScaleFlage(true)

  setDropDownBackground(true)
  setUploadingBackground(false)
  setEditBackground(false)
  setBackgroundAccept(false)
  backgroundRef.current.src='#'
  backgroundRef.current.style.cursor='auto'

}
const handleScaleDown=(e)=>{
  if(backgroundScale<0.2) return null
  setBackgroundScale(pre=>pre-0.1)
  backgroundRef.current.style.transform=`scale(${backgroundScale-0.1})`
}
const handleScaleUp=(e)=>{
  setBackgroundScale(pre=>pre+0.1)
  backgroundRef.current.style.transform=`scale(${backgroundScale+0.1})`
}
const handleProfilePictueUpload=e=>{
  setProfilePictureEditingFlage(true)
  const [file]=profilePictureUploadInputRef.current.files
  profilePictureRef.current.src=URL.createObjectURL(file)
  console.log(profilePictureRef)
}
return (
<>
<div className="contianer container-md">
<div className="row">
  <div className="col">

<div className="images-holder">
  <div className="background-image-container">
    {editBackground&&<div className='form-update-background'>
      <button onClick={handleCancelBackground}  className="btn update-background-btn">
     Cancel   
      </button>
      <button onClick={handlebackgroundConfirm} type='button' className="btn btn-outline update-background-btn">
      confirm
      </button>
      </div>}
    <img   onMouseOut={(e)=>backgroundRef.current.clicking=false} clicking={false} draggable='false' ref={backgroundRef}
     src='#'  onMouseMove={handleMouseUpdate} onMouseEnter={handleMouseUpdate} onMouseUp={handleMouseUp} onMouseDown={handleMouseDown} alt='sbackground-image' className={`background-image ${!editBackground&&'cursor-default'}`}/>
     {dropDownBackground&&<div   className='update-background-container  '>
   <button onClick={()=>setBackgroundMenu(pre=>!pre)} className='  btn-background' ><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-camera" viewBox="0 0 16 16">
  <path d="M15 12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h1.172a3 3 0 0 0 2.12-.879l.83-.828A1 1 0 0 1 6.827 3h2.344a1 1 0 0 1 .707.293l.828.828A3 3 0 0 0 12.828 5H14a1 1 0 0 1 1 1v6zM2 4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-1.172a2 2 0 0 1-1.414-.586l-.828-.828A2 2 0 0 0 9.172 2H6.828a2 2 0 0 0-1.414.586l-.828.828A2 2 0 0 1 3.172 4H2z"/>
  <path d="M8 11a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5zm0 1a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM3 6.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0z"/>
</svg></button>
  {backgroundMenu&&<div className='background-menu'>
    <label className='upload-image' htmlFor="background">

    <input accept='image/*' onChange={handleImgUpload} 
    ref={backgroundMenu1} placeholder='upload' className='upload-background'  
    type="file" name="background" id="background" />
    upload
    </label>
   </div>}

  </div>}
   {scaleFlage&&<div className='scale-container'>
      <svg onClick={handleScaleDown} xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-zoom-out" viewBox="0 0 16 16">
  <path fill-rule="evenodd" d="M6.5 12a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11zM13 6.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0z"/>
  <path d="M10.344 11.742c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1 6.538 6.538 0 0 1-1.398 1.4z"/>
  <path fill-rule="evenodd" d="M3 6.5a.5.5 0 0 1 .5-.5h6a.5.5 0 0 1 0 1h-6a.5.5 0 0 1-.5-.5z"/>
</svg>

<svg  onClick={handleScaleUp}  xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-zoom-in" viewBox="0 0 16 16">
  <path fill-rule="evenodd" d="M6.5 12a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11zM13 6.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0z"/>
  <path d="M10.344 11.742c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1 6.538 6.538 0 0 1-1.398 1.4z"/>
  <path fill-rule="evenodd" d="M6.5 3a.5.5 0 0 1 .5.5V6h2.5a.5.5 0 0 1 0 1H7v2.5a.5.5 0 0 1-1 0V7H3.5a.5.5 0 0 1 0-1H6V3.5a.5.5 0 0 1 .5-.5z"/>
</svg>
    </div>}
    </div>
   
{!editBackground&&<div className="profile-picture-container">
  <div className="profile-img-container">
  <img clicking='false' draggable='false' ref={profilePictureRef}
  onMouseMove={handleMouseUpdate} onMouseEnter={handleMouseUpdate} onMouseUp={handleMouseUp} onMouseDown={handleMouseDown}
  onMouseOut={(e)=>backgroundRef.current.clicking=false}
  src="#" alt="profile-picture" />
  </div>
  <div className="profile-picture-options-container">
    <button onClick={e=>setProfilePictureMenuFlage(pre=>!pre)}  type='button' className='profile-picture-update-button'>
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-camera" viewBox="0 0 16 16">
  <path d="M15 12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h1.172a3 3 0 0 0 2.12-.879l.83-.828A1 1 0 0 1 6.827 3h2.344a1 1 0 0 1 .707.293l.828.828A3 3 0 0 0 12.828 5H14a1 1 0 0 1 1 1v6zM2 4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-1.172a2 2 0 0 1-1.414-.586l-.828-.828A2 2 0 0 0 9.172 2H6.828a2 2 0 0 0-1.414.586l-.828.828A2 2 0 0 1 3.172 4H2z"/>
  <path d="M8 11a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5zm0 1a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM3 6.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0z"/>
</svg>
    </button >
      <div className={`profile-picture-update-menu-container ${!profilePictureMenuFlage&&'hide'}`}>
    <label htmlFor="update-profile-picture">
        <input ref={profilePictureUploadInputRef}   onChange={handleProfilePictueUpload} accept='image/*' placeholder='upload' type='file' name='update-profile-picture' id='update-profile-picture' className=' profile-picture-update-menu-item '/>
         upload
    </label>
      </div>
  </div>

</div>}
</div>
</div>
  </div>
</div>
</>
    )
}

export default User