import React,{useState,useEffect} from 'react'
import Cookies from 'js-cookie'
import store from 'store'
import axios from 'axios'
import utilApi from '../../resources/api/util_requests.js'
import { useNavigate } from 'react-router'
const Home = () => {
  const [user,setUser]=useState({})
  const [userLoggedFlage,setUserLoggedFlage]=useState(false)
  const navigate=useNavigate()
  useEffect(()=>{
    async function getData(){
     const data=await utilApi.getUsersAndCommunities()
     console.log(data)
     store.set('users',data.users)
     store.set('communities',data.communties)
     
    }
     getData()
  },[])
async function checkLogger(){

  if(store.get('user')){
    navigate(`user/${store.get('user')._id}`)
  }
  if(Cookies.get('token')){
    const data =await userAPI.getTheUser(Cookies.get('token'))
    store.set('user',data.user)
    navigate(`/user/${data.user._id}`)
  } 
    useEffect(()=>{
      checkLogger()
    })
    }
  return (
<>
{/* <section style={{ backgroundColor:'#f7f6f6' }}>
  <div className="container my-5 py-5 text-dark">
    <div className="row d-flex justify-content-center">
      <div className="col-md-12 col-lg-10 col-xl-8">
        

        <div className="card mb-3">
          <div className="card-body">
            <div className="d-flex flex-start">
              <img className="rounded-circle shadow-1-strong me-3"
                src="https://mdbcdn.b-cdn.net/img/Photos/Avatars/img%20(26).webp" alt="avatar" width="40"
                height="40" />
              <div className="w-100">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h6 className="text-primary fw-bold mb-0">
                    lara_stewart
                    <span className="text-dark ms-2">Hmm, This poster looks cool</span>
                  </h6>
                  <p className="mb-0">2 days ago</p>
                </div>
                <div className="d-flex justify-content-between align-items-center">
                  <p className="small mb-0" style={{ color: '#aaa' }}>
                    <a href="#!" className="link-grey">Remove</a> •
                    <a href="#!" className="link-grey">Reply</a> •
                    <a href="#!" className="link-grey">Translate</a>
                  </p>
                  <div className="d-flex flex-row">
                    <i className="fas fa-star text-warning me-2"></i>
                    <i className="far fa-check-circle" style={{color:'#aaa'}}></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="card mb-3">
          <div className="card-body">
            <div className="d-flex flex-start">
              <img className="rounded-circle shadow-1-strong me-3"
                src="https://mdbcdn.b-cdn.net/img/Photos/Avatars/img%20(21).webp" alt="avatar" width="40"
                height="40" />
              <div className="w-100">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h6 className="text-primary fw-bold mb-0">
                    the_sylvester_cat
                    <span className="text-dark ms-2">Loving your work and profile! </span>
                  </h6>
                  <p className="mb-0">3 days ago</p>
                </div>
                <div className="d-flex justify-content-between align-items-center">
                  <p className="small mb-0" style={{color:'#aaa'}}>
                    <a href="#!" className="link-grey">Remove</a> •
                    <a href="#!" className="link-grey">Reply</a> •
                    <a href="#!" className="link-grey">Translate</a>
                  </p>
                  <div className="d-flex flex-row">
                    <i className="far fa-check-circle text-primary"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="card mb-3">
          <div className="card-body">
            <div className="d-flex flex-start">
              <img className="rounded-circle shadow-1-strong me-3"
                src="https://mdbcdn.b-cdn.net/img/Photos/Avatars/img%20(20).webp" alt="avatar" width="40"
                height="40" />
              <div className="w-100">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h6 className="text-primary fw-bold mb-0">
                    mindyy_def
                    <span className="text-dark ms-2">Really cool Which filter are you using?
                    </span>
                  </h6>
                  <p className="mb-0">3 days ago</p>
                </div>
                <div className="d-flex justify-content-between align-items-center">
                  <p className="small mb-0" style={{ color:'#aaa' }}>
                    <a href="#!" className="link-grey">Remove</a> •
                    <a href="#!" className="link-grey">Reply</a> •
                    <a href="#!" className="link-grey">Translate</a>
                  </p>
                  <div className="d-flex flex-row">
                    <i className="fas fa-user-plus" style={{ color:"#aaa" }}></i>
                    <i className="far fa-star mx-2" style={{color:"#aaa"}}></i>
                    <i className="far fa-check-circle text-primary"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="card mb-3">
          <div className="card-body">
            <div className="d-flex flex-start">
              <img className="rounded-circle shadow-1-strong me-3"
                src="https://mdbcdn.b-cdn.net/img/Photos/Avatars/img%20(14).webp" alt="avatar" width="40"
                height="40" />
              <div className="w-100">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h6 className="text-primary fw-bold mb-0">
                    t_anya
                    <span className="text-dark ms-2"><span className="text-primary">@macky_lones</span>
                      <span className="text-primary">@rashida_jones</span> Thanks
                    </span>
                  </h6>
                  <p className="mb-0">4 days ago</p>
                </div>
                <div className="d-flex justify-content-between align-items-center">
                  <p className="small mb-0" >
                    <a href="#!" className="link-grey">Remove</a> •
                    <a href="#!" className="link-grey">Reply</a> •
                    <a href="#!" className="link-grey">Translate</a>
                  </p>
                  <div className="d-flex flex-row">
                    <i className="far fa-check-circle text-primary"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section> */}
      <div className=  {` d-flex flex-column align-items-center  mt-5 user-logger-container ${userLoggedFlage&&'hide'}`}>
    <h1>seems you are not logged</h1>
      
      <div className=" mt-3 container d-flex flex-row justify-content-center">

    <button onClick={()=>navigate('/signup')} className="btn p-3 m-3">sign up</button>


    <button onClick={()=>navigate('/login')} className="btn p-3 p m-3 ">log in</button>
      </div>
    </div>
   </>
    )
}

export default Home