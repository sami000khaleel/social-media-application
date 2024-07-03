import React from 'react'
import { useState,useEffect } from 'react'
import store from 'store'
import { useParams } from 'react-router'
import postApi from '../../resources/api/post_requests'
import {Comment,CommentForm} from '../../components/index.js'
import Post from '../../components/Posts/Post/Post'
import utilApi from '../../resources/api/util_requests'
import userAPI from '../../resources/api/user_requests'
const Comments = () => {
    const params=useParams()
    const [post,setPost]=useState({_id:''})
const [showCommentFormFlage,setShowCommentFormFlage]=useState(false)
const [users,setUsers]=useState([])
const [comments,setComments]=useState([])
const [user,setUser]=useState({_id:''})
const [flage,setFlage]=useState(false)
const [commentsFlage,setCommentsFlage]=useState(false)
async function getComments(){
    const data =await postApi.getComments(params.postId)
    setComments(data.comments) 
    console.log('ssssss')   
    setCommentsFlage(true)
}
useEffect(()=>{
async function fetchUser(params) {
    const data=await userAPI.getUser()
}
},[])
async function getUsers(){

    let ids=comments.map(({user})=>user)
    const data=await utilApi.getUsers(ids)
    if(!data.success)
    return
    setUsers(data.users)
  }
useEffect(()=>{
    async function getPost(){
        const data=await postApi.getPost(params.postId)
        setPost(data.post)
    }
    getPost()
    getComments()
},[])   
function displayComments(comments){
return comments.map((comment,i)=><Comment  postId={params.postId} key={comment._id} user={users[i]} passedComment={comment} /> )
}
useEffect(()=>{
    getComments()
},[showCommentFormFlage])
useEffect(()=>{
  
 
    getUsers() 
    
    // setUsers(ids)
},[comments])
function appendCommentsAndUsers(newComment){
    if(newComment.repliedTo)
    return
    if(!newComment.repliedTo){

        setComments(pre=>[...pre,newComment])
        setUsers(pre=>[...pre,store.get('user')])
        setPost(pre=>{
            return {
                ...pre,comments:[... pre.comments,newComment]
            }
        })
    }
}

    console.log('wwwwwwww')
    const updateCommentFormFlage=()=>{setShowCommentFormFlage(pre=>!pre)
    }
return (
<>
<div style={{minHeight:'100vh',minWidth:'100vw' }} className=' position-relative d-flex flex-column align-items-center ' >

{post._id?<Post post={post} numberOfComments={post.comments.length} updateCommentFormFlage={updateCommentFormFlage} />:'loading post'}
{showCommentFormFlage&&<CommentForm  appendCommentsAndUsers={appendCommentsAndUsers} updateCommentFormFlage={updateCommentFormFlage} postId={params.postId}  />}
{comments.length&&users.length?
<div  className="container pt-4   position-relative  ">
<div className="row">
    <div className="col">
    <div style={{ width:'100vw' }} className="d-flex flex-column  align-items-center comments-container">
        {displayComments(comments)}
        {/* {comments.map(comment=><div className='comment-container'>
s
        </div>)} */}
    
    </div>
    </div>
</div>
</div>
 :commentsFlage?'no comments was found':'loading'}
 </div>
</>
    )
}

export default Comments