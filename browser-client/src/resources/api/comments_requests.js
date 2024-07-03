import axios from "axios"
import store from "store"
import Cookies from "js-cookie"
const baseUrl='http://localhost:1000/api'
class Comment{
    constructor(){

    }
    static async createComment(repliedCommentId,postId,content)
    {
        try{
            console.log(repliedCommentId)
            let headers={
                'Authorization':Cookies.get('token')
            }
            const {data}=await axios.post(`${baseUrl}/comments`,{repliedCommentId,postId,content},{headers})
           console.log(data.comment)
            // console.log(data)
            return data
        }
        catch(err){
            console.log(err.response.data)
            return err.response.data
        }
    }
    static async likeComment(commentId,postId)
    {
        try{
            let headers={
                'Authorization':Cookies.get('token')
            }
            const {data}=await axios.patch(`${baseUrl}/comments/likes`,{commentId,postId},{headers})
            // console.log(data)
            return data
        }
        catch(err){
            console.log(err.response.data)
            return err.response.data
        }
    }
    static async deleteComment(commentId){
        try{
          const  headers={
                'Authorization':Cookies.get('token')
            }
            const {data}=await axios.delete(`${baseUrl}/comments?commentId=${commentId}`,{headers})
            return data
        }
        catch(err){
            console.log(err.response)
            return err.response
        }
    }
    static async updateComment(commentId,content){
        try{
          const  headers={
                'Authorization':Cookies.get('token')
            }
            const {data}=await axios.patch(`${baseUrl}/comments`,{commentId,content},{headers})
       return data
        }
        catch(err){
            console.log(err)
            console.log(err.response.data)
            return err.response.data
        }
    }
}
export default Comment