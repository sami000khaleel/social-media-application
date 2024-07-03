import axios from "axios"
import Cookies from "js-cookie"
const baseUrl='http://localhost:1000/api'
export default class postApi{
    constructor(){

    }
    static async getLikes(postId){
        try
        {
            const {data}=await axios.get(`${baseUrl}/posts/likes?postId=${postId}`,{
                headers:{'Authorization':Cookies.get('token')}
            })
            return data        }
        catch(err){
            console.log(err.response.data)
            return err.response.data
        }
    }
     static async getPost(postId)
     {
        try
        {
            const {data}=await axios.get(`${baseUrl}/posts?postId=${postId}`)
            return data
        }
        catch(err){
            return err.response.data
        }
     }
     // get 10 posts
    //  static async getPosts(){}
     static async makePost(post,community,sharedPostId){
        try
        {
            let formData=new FormData()
            formData.set('image',post.image)
            formData.set('describtion',post.describtion)
            formData.set('communityId',post.communityId||'')
            const headers={
                'authorization':Cookies.get('token'),
                'shared-post-id':post.sharedPostId||''
            }
            const {data}=await axios.post(`${baseUrl}/posts`,formData,{headers})
            return data
        }
        catch(err){
            console.log(err.response.data)
            return err.response.data
        }
     }
     static async like(postId){
        try
        {
            const {data}=await axios.patch(`${baseUrl}/posts/like`,{postId},{
                headers:{
                  'Authorization':Cookies.get('token')
                }
            })
            return data
        }
        catch(err)
        {
            console.log(err)
            return err.data
        }
     }
     static async getComments(postId){
        try{
            console.log(postId)
            const {data}=await axios.get(`http://localhost:1000/api/posts/comments?postId=${postId}`,{
                headers:{
                    'Authorization':Cookies.get('token')
                }
            })
            console.log(data)
            return data
        }
        catch(err){
            console.log(err.response)
            return err.response.data
        }
     }
     static async deletePost(postId) {
        try{

            const headers={
                Authorization:Cookies.get('token')
            }
            const {data}=await axios.delete(`${baseUrl}/posts?postId=${postId}`,{
                headers
            })
            return data
    }
        catch({response}){
            console.log(response)
            return response.data
        }
     }
     static async updatePost(postId,describtion) {
        try{
            console.log(describtion)
            const headers={
                Authorization:Cookies.get('token')
            }
            const {data}=await axios.patch(`${baseUrl}/posts`,{
                postId,describtion
            },{headers})
            return data
    }
        catch({response}){
            console.log(response)
            return response.data
        }
     }
    }
