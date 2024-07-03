import React from 'react'
import store from 'store'
import { useNavigate,useParams } from 'react-router'
import { useState,useRef,useEffect } from 'react'
import Cookies from 'js-cookie'
import userAPI from '../../resources/api/user_requests'
const EditImg = () => {
  const [errMsg,setErrMsg]=useState()
  const [imgShow,setImgShow]=useState(false)
  const [file,setFile]=useState()
  const containerRef=useRef('')
  const [imageType,setImageType] =useState('')
  const navigate=useNavigate()
  const [imgSize,setImgSize]=useState(0.1)
  const [clicking,setClicking]=useState(false)
    const [lastOffset,setLastOffset]=useState({y:0})
    const imgRef=useRef('')
    const {imageSrc}=useParams()
    const handleScaleUp=e=>{
      e.preventDefault()
      setImgSize(pre=>pre+0.1)
    }
    const handleScaleDown=e=>{
      e.preventDefault()
      if(imgSize<0.015)
      return
      if(imgSize<0.15) {
        setImgSize(pre=>pre-0.01)
        return
      }
      setImgSize(pre=>pre-0.1)
      
    }
    const handleMouseDown=e=>{
      setClicking(true)
      
      e.preventDefault()
      imgRef.current.initpos={y:e.pageY}
      
    }
    const handleMouseMove=e=>{
      e.preventDefault()
  if(clicking){
    console.log(clicking)
    imgRef.current.offset=
  {
  y:e.pageY-imgRef.current.initpos.y+lastOffset.y}
  }
imgRef.current.style.top=`${imgRef.current.offset.y}px`
}
const handleMouseUp=e=>{
  e.preventDefault()
  setClicking(false)
  setLastOffset({...imgRef.current.offset})
}
const handleConfrim=async (e)=>{
  e.preventDefault()

  const img = imgRef.current;
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  canvas.toBlob(blob => {
    const file = new File([blob], store.get('image-name'), { type: 'image/png' });
    
     setFile(file)
  }, 'image/png');
}
  const handleCancel=e=>{
    e.preventDefault()
    
  }
  useEffect(()=>{
containerRef.current.classList.forEach(className=>{
  if(className==='profile-image')
    setImgSize(0.1)
})

  },[imgRef])
useEffect(()=>{
  setImageType(()=>store.get('type'))
},[])
useEffect(()=>{
  async function updataImage(){
    if(!file)
    return
    let data={}
    const style=JSON.stringify({
    top:`${lastOffset.y}`,
    scale:imgSize
  })
  let formData=new FormData()
  formData.set('style',style)
  formData.set('image',file)
//post request image styles and image url
let user=store.get('user')
if(imageType==='background-image')
{
  data=await userAPI.updateUserImage(formData,'cover-image')
 if(!data.success){
  setErrMsg(data.err)
return 
}
  user.coverImage=data.image
}
if(imageType==='profile-image')
{data=await userAPI.updateUserImage(formData,'profile-image')
if(!data.success){
  setErrMsg(data.err)
  return 
}
user.profileImage=data.image
}
store.set('user',user)
setErrMsg('')
store.set('owner',user)
console.log(data)
navigate(`../user/${user._id}`)
}
updataImage()
},[file])


  return (
    <>
    <div className="container container-fluid ">
<div className="row">
<div className="col ">

  <div style={{ marginTop:'150px',height:'300px',width:'300px' }} ref={containerRef} className={` ${imageType}`}>


<img style={{ transform:`scale(${imgSize})` }} draggable='false' onMouseUp={handleMouseUp} onMouseMove={handleMouseMove} className='edited-image' ref={imgRef} initpos={{ x:0,y:0 }}
offset={{y:0}}  currentpos={{y:0 }} 
lastoffset={{y:0}} src={`blob:http://localhost:5173/${imageSrc}`} alt="image"
onMouseDown={handleMouseDown} 
/>
  </div>

  <section className="btns-container">

  <button onClick={handleConfrim} className="confirm-btn btn ">
    Confirm
  </button>
  <button onClick={handleCancel} className="cancelation-btn btn">
    Cancel
  </button>
  </section>
<div className='scaler-container'>
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
    </div>
 </div>

 </div>

    </div>
    </>
    )
}

export default EditImg