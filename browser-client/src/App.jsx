import React from 'react'
import { Community } from './components/index.js'
import {Comments,EditImg,WaitingPosts,Users,Search,Logout,Follow,User,Login,Signup,Home,CommunityForm} from './pages/index.js'
import {  NavBar } from './components/index.js'
import {useNavigate,Routes,Route} from 'react-router-dom'
const App = () => {
  return (
<>
<div className="position-relative">

<Routes  >
  <Route path='/' element={<NavBar/>} >
    <Route index element={<Home/>} />
    <Route path='/community/:communityId' element={<Community  />} />
    <Route path='/create-community' element={<CommunityForm/>} />
    <Route path='/users/' element={<Users/>} />
    <Route path='/waiting-posts/:communityId' element={<WaitingPosts/>} />
    <Route path='user/follow/:type' element={<Follow/>} />
    <Route path='user/:id' element={<User/>} />
    <Route path='/search' element={<Search/>} />
    <Route path='comments/:postId' element={<Comments/>} />
</Route>
<Route path='/logout' element={<Logout/>}/>

<Route path='/signup' element={<Signup />}/>
<Route path='/login' element={<Login />}/>

<Route path='/edit-image/:imageSrc' element={<EditImg/>}/>
</Routes>
</div>
</>
    )
}

export default App