import LandingPage from './components/HomePage'
import AboutPage from './components/About'
import Navbar from './components/Navbar'
import ArtWork from './components/ArtWork'
const App = () => {
  return (
    <>

      <Navbar />
      
        <LandingPage />
        <AboutPage /> 
        <ArtWork />

    </>
  )
}
export default App;