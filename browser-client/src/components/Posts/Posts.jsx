import React from 'react'
import Post from './Post/Post.jsx'
import { useEffect,useState } from 'react'
import postApi from '../../resources/api/post_requests.js'

const Posts = ({posts,user,community,communityApprovePost,communityDeletePost}) => {

  // make api call to posts
  return (
  <div className="row" >
    <div className="col d-flex flex-column align-items-center justify-content-center">

    {posts.map(post=>< Post communityApprovePost={communityApprovePost} communityDeletePost={communityDeletePost} post={post} community={community} user={user} key={post._id} />)}
    </div>

  </div>
  )
}

export default Posts