import { Routes, Route } from "react-router-dom";
import Dashboard from "./page/Dashboard";
import Sidebar from "./component/Sidebar";
import { useEffect } from "react";
import FacilityList from "./page/FacilityList";
import FacilityRegister from "./page/FacilityRegister";
import FacilityDetail from "./page/FacilityDetail";
import * as React from "react";

export default function App() {
  useEffect(() => {
  document.body.style.margin = "0";
  document.body.style.padding = "0";
}, []);
  return (
    <Routes>
      <Route elment={<Sidebar/>}> 
      <Route path="/" element={<Dashboard />} />
      <Route path="/list" element={<FacilityList/>}/>
      <Route path="/register" element={<FacilityRegister/>}/>
      <Route path="/detail/:id" element={<FacilityDetail/>}/>
      </Route>
    </Routes>
  );
}
