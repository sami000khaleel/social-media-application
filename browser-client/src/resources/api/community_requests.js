import Cookies from "js-cookie"
import axios from "axios"
const baseUrl='http://localhost:1000/api'
export default class communityApi{
    constructor(){

    }

    static async memberJoin(communityId){
        try{
            const headers={
                'Authorization':Cookies.get('token'),
            }
            const {data}=await axios.post(`${baseUrl}/community/members`,{communityId},{headers})
            return data
            }
        catch(err){

            return err.response.data
        }
    }
    static async communityBlock(communityId,blockedUserId){
        try{
            const headers={
                'Authorization':Cookies.get('token'),
            }
            const {data}=await axios.patch(`${baseUrl}/community/block`,{blockedUserId,communityId},{headers})
            return data
            }
        catch(err){

            return err.response.data
        }
    }
    static async getImage(communityId,imageName){
        try{
            const headers={
                'Authorization':Cookies.get('token'),
            }
            const {data}=await axios.get(`${baseUrl}/community/image/${imageName}?communityId=${communityId}`,{headers})
            return data
            }
        catch(err){

            return err.response.data
        }
    }
    static async deleteImage(communityId,imageName){
        try{
            const headers={
                'Authorization':Cookies.get('token'),
            }
            const {data}=await axios.delete(`${baseUrl}/community/image/${imageName}?communityId=${communityId}`,{headers})
            return data
            }
        catch(err){

            return err.response.data
        }
    }
    static async removeMember(communityId,joinerId){
        try{

            const headers={
                'Authorization':Cookies.get('token')
            }
            const {data}=await axios.delete(`${baseUrl}/community/members?communityId=${communityId}`,{headers})
            return data
            }
        catch(err){

            return err.response.data
        }
    }
    static async updateImage(communityId,image){
        try{
            const formData=new FormData()
            formData.append('communityId',communityId)
            formData.append('image',image)
            const headers={'Authorization':Cookies.get('token')}
            const {data}= await axios.patch(`${baseUrl}/community/image`,formData,{headers})
            console.log(data)
            return data
            }
        catch(err){
            console.log(err)
            return err.response.data
        }
    }
    static async removeMemberByRole(communityId,joinerId,role){
        try{

            const headers={
                'Authorization':Cookies.get('token'),
                'community-role':role
            }
            const {data}=await axios.delete(`${baseUrl}/community/members/role?communityId=${communityId}&joinerId=${joinerId}`,{communityId,joinerId},{headers})
            return data
            }
        catch(err){

            return err.response.data
        }
    }
    static async roleApproveJoin(communityId,joinerId,role){
        try{

            const headers={
                'Authorization':Cookies.get('token'),
                'community-role':role
            }
            const {data}=await axios.post(`${baseUrl}/community/members/role/join`,{communityId,joinerId},{headers})
            return data
            }
        catch(err){
console.log(err)
            return err.response.data
        }
    }
    static async userRemoveReq(communityId,joinerId){
        try{

            const headers={
                'Authorization':Cookies.get('token'),
            }
            const {data}=await axios.delete(`${baseUrl}/community/members/join?communityId=${communityId}&joinerId=${joinerId}`,{headers})
            return data
            }
        catch(err){

            return err.response.data
        }
    }

    static async roleRemoveReq(communityId,joinerId,role){
        try{

            const headers={
                'Authorization':Cookies.get('token'),
                'community-role':role
            }
            const {data}=await axios.delete(`${baseUrl}/community/members/role/join?communityId=${communityId}&joinerId=${joinerId}`,{headers})
            return data
            }
        catch(err){

            return err.response.data
        }
    }
    static async reqJoin(communityId){
        try{

            const headers={
                'Authorization':Cookies.get('token')
            }
            const {data}= await axios.post(`${baseUrl}/community/members/join`,{communityId},{headers})
            return data
            }
        catch(err){

            return err.response.data
        }
    }

    static async deletePost(communityId,postId,role){
        try{

            const headers={
                'Authorization':Cookies.get('token'),
                "community-role":role
            }
            const {data}=await axios.delete(`${baseUrl}/community/posts?postId=${postId}&communityId=${communityId}`,{headers})
            return data
            }
        catch(err){

            return err
        }
    }
    static async changePublicity(communityId){
        try{

            const headers={
                'Authorization':Cookies.get('token')
            }
            const {data}=await axios.patch(`${baseUrl}/community/manager/publicity`,{communityId},{headers})
            console.log(data)
            return data
            }
        catch(err){
            console.log(err.response)
            return err.response.data
        }
    }
    static async changePostApproval(communityId){
        try{

            const headers={
                'Authorization':Cookies.get('token')
            }
            const {data}=await axios.patch(`${baseUrl}/community/manager/post-approval`,{communityId},{headers})
            return data
            }
        catch(err){

            return err.response.data
        }
    }
    static async addAdmins(communityId,adminsId){
        try{

            const headers={
                'Authorization':Cookies.get('token')
            }
            const {data}=await axios.post(`${baseUrl}/community/admins`,{communityId,adminsId},{headers})
            return data
            }
        catch(err){

            return err.response.data
        }
    }
    static async removeAdmins(communityId,adminsId){
        try{

            const headers={
                'Authorization':Cookies.get('token')
            }
            const {data}=await axios.patch(`${baseUrl}/community/admins/remove`,{communityId,adminsId},{headers})
            console.log(data)
            return data
            }
        catch(err){

            return err.response.data
        }
    }
    static async switchManager(communityId,newManagerId){
        try{

            const headers={
                'Authorization':Cookies.get('token')
            }
            const {data}= await axios.patch(`${baseUrl}/community/manager`,{communityId,newManagerId},{headers})
            return data
            }
        catch(err){

            return err.response.data
        }
    }
    static async getCommunity(id){
        try{
            const headers={
                'Authorization':Cookies.get('token')
            }
            const {data}=await axios.get(`${baseUrl}/community?communityId=${id}`)
            console.log(data)
            return data
        }
        catch(err){
            console.log(err)

            return err.response.data
        }
    }
    static async createCommunity(communityName,describtion,admins){
        try
        {
            const adminsId=admins.map(admin=>admin._id)
            const headers={
                'Authorization':Cookies.get('token')
            }
            const {data}=await axios.post(`${baseUrl}/community`,{communityName,describtion,adminsId},{headers})
            console.log('as')
            return data
         }
        catch({response}){
            console.log(response.data)
            return response.data
        }
    }
    static async deleteCommunity(communityId){
        try
        {
            const headers={
                'Authorization':Cookies.get('token')
            }
            const {data}=await axios.delete(`${baseUrl}/community?communityId=${communityId}`,{headers})
            return data
         }
        catch({response}){
            console.log(response.data)
            return response.data
        }
    }
    static async approvePost(communityId,postId){
        try
        {
            const headers={
                'Authorization':Cookies.get('token')
            }
            const {data}=await axios.patch(`${baseUrl}/community/posts`,{communityId,postId},{headers})
            return data
         }
        catch(err){
            console.log(err)
            return err
        }
    }
    static async getPosts(communityId){
        try
        {
            const headers={
                'Authorization':Cookies.get('token')
            }
            const {data}=await axios.get(`${baseUrl}/community/get-posts?communityId=${communityId}`,{headers})
            return data
         }
        catch(err){
            console.log(err.response)
            return err.response
        }
    }
    static async getUnapprovedPosts(communityId){
        try
        {
            const headers={
                'Authorization':Cookies.get('token')
            }
            const {data}=await axios.get(`${baseUrl}/community/unapproved/get-posts?communityId=${communityId}`,{headers})
            return data
         }
        catch(err){
            console.log(err.response)
            return err.response
        }
    }
}