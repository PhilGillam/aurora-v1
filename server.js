const express=require("express");

const app=express();

app.use(express.static("app"));

app.listen(3030,()=>{
 console.log(
 "Aurora running http://localhost:3030"
 );
});
