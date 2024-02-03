import "./style.css";
import Pocketbase from "pocketbase";

document.getElementById("app").innerHTML = `Pocketbase Test Bench`;
const pb = new Pocketbase("https://xvpkwbmb.pocketspace.dev");

await pb.collection("users").authWithPassword("test@example.com", import.meta.env.VITE_PB_PASSWORD);

/*
const courses = await pb.collection("courses").getFullList();

const coursesList = document.createElement("ul");
coursesList.innerHTML = courses.map((course) => `<li>${course.title}</li>`).join("");
document.getElementById("app").appendChild(coursesList);

*/

const lessons = await pb.collection("lessons").getFullList();
console.log(JSON.stringify(lessons, null, 2));

const lessonsList = document.createElement("ul");
lessonsList.innerHTML = lessons.map((lesson) => `<li>${lesson.title}</li>`).join("");

document.getElementById("app").appendChild(lessonsList);
