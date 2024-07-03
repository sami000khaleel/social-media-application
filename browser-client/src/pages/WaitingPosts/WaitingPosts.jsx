import { useState,useEffect } from "react"
import store from "store"
import communityApi from "../../resources/api/community_requests"
import { Posts } from "../../components"
import { useParams,useNavigate} from "react-router"
const WaitingPosts = () => {
    const [community,setCommunity]=useState({_id:''})

    const params=useParams() 
    useEffect(()=>{
       communityApi.getCommunity(params.communityId).then(data1=>
        communityApi.getUnapprovedPosts(params.communityId)
        .then(data2=>setCommunity({...data1.community,posts: data2.posts}))
        .catch(err=>console.log(err))
    ).catch(err=>console.log(err)) 
    },[])
    async function communityDeletePost(postId){
        let role
        if(community.manager._id===store.get('user')._id)
          role= 'manager'
        else
         role= 'admin'      
           const data=await communityApi.deletePost(params.communityId,postId,role)
        if(!data.success)
        console.log(data) 
        communityApi.getUnapprovedPosts(params.communityId).
        then(data=>setCommunity(pre=>({...pre,posts:data.posts})))
    }
    async function communityApprovePost(postId){
        const data=await communityApi.approvePost(community._id,postId)
        if(!data.success)
        return 
        communityApi.getUnapprovedPosts(params.communityId).
        then(data=>setCommunity(pre=>({...pre,posts:data.posts})))
    }
return (<>
    {community._id&&<div style={{ marginTop:'30px' }} className="d-flex align-items-center flex-column ">
        <Posts communityApprovePost={communityApprovePost} communityDeletePost={communityDeletePost} posts={community.posts.map(post=>(post.postId))}  community={community}   />

    </div>}
    </>
    )
}

export default WaitingPosts