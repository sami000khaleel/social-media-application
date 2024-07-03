import {useState,useEffect} from 'react'
import store from 'store'
import { commentApi } from '../../../resources/api'
const CommentForm = ({postId,updateCommentFormFlage,appendCommentsAndUsers,appendReplies,changeFlage}) => {
    const [repliedComment,setRepliedComment]=useState(()=>store.get('repliedComment')||{_id:''})
    const [commentContent,setCommentContent]=useState('')
    const handleChange=(e)=>setCommentContent(e.target.value)
    const handleCreateComment=async (e)=>{
      e.preventDefault()
      if(changeFlage)
      changeFlage()
      console.log(commentContent)
      if(!commentContent)
      return
      const data=await commentApi.createComment(repliedComment._id,postId,commentContent)
      if(!data.success)
      return
      if(!repliedComment._id){
        console.log('xxxxxxxxzzzzzzzzz')
        appendCommentsAndUsers(data.comment)
        store.set('repliedComment',{_id:''})
      }
      if(repliedComment._id){
        appendReplies(data.comment)
        console.log('sdas')
      }
      store.set('repliedComment',{_id:''})
      updateCommentFormFlage()
    }
    console.log(repliedComment._id)
    return (
    <>
    <div className="position-absolute  top-0 left-0  "   style={{ backgroundColor:'rgba(0,0,0,0.6)',width:'100vw',height:'3000vh',zIndex:'99999999999999999999' }} >
    <div className="  comment-form card  shadow position-fixed bottom-20 ">

    <form style={{ border:'none' }}>
    <button  onClick={updateCommentFormFlage}  className="  exit-btn ">exit</button>

  <div className="d-flex flex-column justify-content-start align-items-start form-group">
    <label for="exampleFormControlTextarea1"> write your comment ... </label>
    <textarea onChange={handleChange} className="form-control" id="exampleFormControlTextarea1" rows="3"></textarea>
  <button onClick={handleCreateComment} className="btn ">submit comment</button>
  </div>
</form>
    </div>
    </div>
    </>
    )
}

export default CommentForm