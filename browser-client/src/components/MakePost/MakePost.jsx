import { useRef,useState,useEffect } from 'react'
import postApi from '../../resources/api/post_requests'
import store from 'store'
import userAPI from '../../resources/api/user_requests'
import { useParams,Navigate} from 'react-router'
const MakePost = ({setCommunity,updateUser,communityId,sharedPostId,updateFormFlage}) => {
    const params=useParams()
    const [image,setImage]=useState()
    const [imageSrc,setImageSrc]=useState('')
    const [post,setPost]=useState({
        describtion:'',
        image:null,
        communityId:communityId||null,
        sharedPostId:sharedPostId||null
    })
    const imageRef=useRef('')
    const textRef=useRef('')
    async function handleMakePost(){
    let data=await postApi.makePost(post,sharedPostId)
      if(communityId)
      setCommunity(pre=>({...pre,posts:[...pre.posts,data.post]}))
    if(!data.success)
      // throw err
      textRef.current.value=''  
      imageRef.current.value=''  
      setImageSrc('')
      data=await userAPI.getUser(store.get('user')._id)
      console.log('aaaaa')
      if(sharedPostId)
      updateFormFlage()
       if(!data.success)
      {setSuccess(false)
      console.log('no no')}
      updateUser(data.user)
    }
  

    const handleChange = (event) => {
        const target = event.target;
        const name = target.name;
        const value = target.type === 'file' ? target.files[0] : target.value;
    
        setPost((prevState) => ({
          ...prevState,
          [name]: value,
        }));
      };

      return (
    <div className="row">
        <div className="col card p-3 shadow pd d-flex justify-content-center flex-column align-items-start">
        <h3>make a post now </h3>
        <p>what are you thinking ? </p>
        <textarea ref={textRef} onChange={handleChange} name='describtion' style={{ width:'100%'}} className="form-control" id="exampleFormControlTextarea1" rows="3"></textarea>
        <input ref={imageRef}
         name='image' onChange={(e)=>{
                setImage(e.target.files[0])
                let url= URL.createObjectURL(e.target.files[0])
                let arr=url.split('/')
                // setImageSrc(arr[arr.length-1])
                setImageSrc(url)
                handleChange(e)

            } }className="form-control" 
       type="file" accept='*image /.mp4' multiple></input>
       <div style={{ width:'40vw',height:'200px' }} className="">

        <img height='300px' className='mt-3 object-fit-cover'  style={{ objectFit:'contain',width:'100%' }}  src={imageSrc} alt="image" />
       </div>
       <button onClick={handleMakePost} className='btn-primary btn'>submit</button>
        </div>
    </div>
    )
}

export default MakePost