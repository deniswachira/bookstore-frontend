import axios from "axios";

const axiosInstance = axios.create({
  baseURL: "bookstore-server.azurewebsites.net/", // Replace with your API base URL
  headers: {
    "Content-Type": "application/json",
  },
});

export default axiosInstance;
