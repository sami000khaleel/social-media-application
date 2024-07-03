import {useState,useEffect} from 'react'
import Reply from './Reply/Reply'
import { useParams } from 'react-router'
import CommentForm from '../CommentForm/CommentForm'
import utilApi from '../../../resources/api/util_requests'
import { commentApi } from '../../../resources/api'
import { set } from 'store'
const Replies = ({comments,appendReplies}) => {
  const params=useParams()
  const [replies,setReplies]=useState(comments)
  const [users,setUsers]=useState([])
  const [repliesFormFlage,setRepliesFormFlage]=useState(false)
  // useEffect(()=>{
  //   async function getReplies(){
  //     const data=await commentApi.getReplies()
  //     if(!data.success)
  //     return
  //     setReplies(data.comments)

  //   }
  //   getReplies()
  // },[])
  const updateCommentFormFlage=()=>setRepliesFormFlage(pre=>!pre)
  useEffect(()=>{
    async function getUsers(){
        console.log('fetching users')
       const ids=replies.map(reply=>reply.user)
       if(!ids.length)
       retrun 
    const data =await utilApi.getUsers(ids)
    if(!data.success)
    return 
    console.log(data)
    setUsers(data.users)
    }
    getUsers()
  },[])  
  const appendCommentsAndUsers=(newReply)=>{
    setReplies(pre=>[...pre,newReply])
    setUsers(pre=>[...pre,store.get('user')])
    console.log('xxxxxxxxx')
    setRepliesFormFlage(pre=>!pre)
    console.log(repliesFormFlage)
  }
//   console.log(users)
    return (<>
                
                {replies.length&&users.length?

            <div className="replies-container m-3 " style={{  }}>
             {repliesFormFlage&&<CommentForm appendReplies={appendReplies} updateCommentFormFlage={updateCommentFormFlage} postId={useParams.postId}/>}
                {replies.map((comment,i)=><Reply  key={comment._id} passedUser={users[i]} comment={comment}  />
                        
                        )}
                        </div>
                    
        :null}
        </>
    )
}

export default Replies