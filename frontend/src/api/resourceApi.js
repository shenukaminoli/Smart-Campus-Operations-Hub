import axios from "axios";
const API = "http://localhost:8081/api/resources";

export const getResources = (params) => axios.get(API, { params });
export const createResource = (data) => axios.post(API, data);
export const updateResource = (id, data) => axios.put(`${API}/${id}`, data);
export const deleteResource = (id) => axios.delete(`${API}/${id}`);