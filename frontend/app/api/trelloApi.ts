import axios from 'axios'

const API_BASE = "http://localhost:5001/api";

export const getBoards = async() => axios.get(`${API_BASE}/test-trello`);
export const createBoard = async(data : any) => axios.post(`${API_BASE}/board`, data);
export const createTask = async(data : any) => axios.post(`${API_BASE}/task`, data);
export const updateTask = async({cardId , data} : any) => axios.put(`${API_BASE}/task/${cardId}`, data)
export const archiveTask = async(cardId : any) => axios.put(`${API_BASE}/task/${cardId}`);
export const deleteTask = async(cardId : any) => axios.delete(`${API_BASE}/task/${cardId}`);
export const getListsForBoard = async (boardId : any) =>
  axios.get(`${API_BASE}/board/${boardId}/lists`);
export const getCardsForList = async (listId : any) =>
  axios.get(`${API_BASE}/lists/${listId}/cards`);