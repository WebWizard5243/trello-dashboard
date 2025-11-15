"use client";
import { useState, useEffect } from "react";
import { Pencil, Trash2, X, Plus, ArrowLeft, MoreVertical } from "lucide-react";
import { io } from "socket.io-client";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import {
  getBoards,
  getListsForBoard,
  getCardsForList,
  createBoard,
  createTask,
  updateTask,
  deleteTask,
} from "./api/trelloApi";

type TrelloList = {
  id: string;
  name: string;
};

type TrelloCard = {
  id: string;
  name: string;
  desc?: string;
};

type CardsByList = {
  [listId: string]: TrelloCard[];
};

export default function HomePage() {
  const [boards, setBoards] = useState<any[]>([]);
  const [lists, setLists] = useState<TrelloList[]>([]);
  const [cards, setCards] = useState<CardsByList>({});
  const [selectedBoard, setSelectedBoard] = useState<string | null>(null);
  const [newBoardName, setNewBoardName] = useState("");
  const [editingCard, setEditingCard] = useState<string | null>(null);
  const [newCardName, setNewCardName] = useState("");
  const [addingCardToList, setAddingCardToList] = useState<string | null>(null);
  const [cardMenuOpen, setCardMenuOpen] = useState<string | null>(null);
  const [newCardDesc, setNewCardDesc] = useState("");


  useEffect(() => {
    const socket = io("http://localhost:5001");

    // CARD CREATED
    socket.on("cardCreated", (card) => {
      setCards((prev) => {
        const listId = (card as any).idList;
        if (!listId) return prev;
        return {
          ...prev,
          [listId]: [...(prev[listId] || []), card],
        };
      });
    });

    // CARD UPDATED
    socket.on("cardUpdated", ({ cardId, updates }) => {
      setCards((prev) => {
        let newData: CardsByList = { ...prev };

        // If list changed
        if (updates.idList) {
          const oldListId = Object.keys(prev).find((listId) =>
            prev[listId].some((c) => c.id === cardId)
          );
          const newListId = updates.idList;

          if (!oldListId) return prev;

          // Remove from old
          newData[oldListId] = newData[oldListId].filter(
            (c) => c.id !== cardId
          );

          // Add to new
          // avoid duplicates
if (!newData[newListId].some(c => c.id === cardId)) {
  newData[newListId] = [
    ...(newData[newListId] || []),
    { id: cardId, ...updates }
  ];
}


          return newData;
        }

        // If list didn't change
        for (const listId in newData) {
          newData[listId] = newData[listId].map((card) =>
            card.id === cardId ? { ...card, ...updates } : card
          );
        }

        return newData;
      });
    });

    // CARD DELETED
    socket.on("cardDeleted", ({ cardId }) => {
      setCards((prev) => {
        const updated: CardsByList = { ...prev };
        for (const listId in updated) {
          updated[listId] = updated[listId].filter(
            (card) => card.id !== cardId
          );
        }
        return updated;
      });
    });

    // CARD ARCHIVED
    socket.on("cardArchived", ({ cardId }) => {
      setCards((prev) => {
        const updated: CardsByList = { ...prev };
        for (const listId in updated) {
          updated[listId] = updated[listId].filter(
            (card) => card.id !== cardId
          );
        }
        return updated;
      });
    });

    
    socket.on("trelloEvent", (event) => {
      console.log("Webhook Event:", event);

      const action = event.action;
      if (!action) return;

      // Card moved between lists
      if (action.type === "updateCard" && action.data.listAfter) {
        const cardId = action.data.card.id;
        const newListId = action.data.listAfter.id;
        const oldListId = action.data.listBefore.id;

        setCards((prev) => {
          let updated: CardsByList = { ...prev };

          if (!updated[oldListId]) return prev;

          updated[oldListId] = updated[oldListId].filter(
            (c) => c.id !== cardId
          );

          if (!updated[newListId].some(c => c.id === cardId)) {
  updated[newListId] = [
    ...(updated[newListId] || []),
    action.data.card
  ];
}


          return updated;
        });
      }

     
      if (action.type === "updateCard" && action.data.card) {
        const cardId = action.data.card.id;
        const updatedCard = action.data.card;

        setCards((prev) => {
          let updated: CardsByList = { ...prev };

          for (const listId in updated) {
            updated[listId] = updated[listId].map((card) =>
              card.id === cardId ? { ...card, ...updatedCard } : card
            );
          }

          return updated;
        });
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Drag & Drop handler (between lists, persisted to Trello)
  const handleDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;

    if (!destination) return;

    const sourceListId = source.droppableId;
    const destListId = destination.droppableId;

    
    if (
      sourceListId === destListId &&
      source.index === destination.index
    ) {
      return;
    }


    if (sourceListId === destListId) return;

    
    setCards((prev) => {
      const sourceCards = Array.from(prev[sourceListId] || []);
      const destCards = Array.from(prev[destListId] || []);
      const [moved] = sourceCards.splice(source.index, 1);

      if (!moved) return prev;

      destCards.splice(destination.index, 0, moved);

      return {
        ...prev,
        [sourceListId]: sourceCards,
        [destListId]: destCards,
      };
    });

    try {
      await updateTask({
        cardId: draggableId,
        data: {
          idList: destListId,
         
        },
      });
    } catch (err) {
      console.error("Error moving card:", err);
     
    }
  };

  // Load boards initially
  useEffect(() => {
    const loadBoards = async () => {
      try {
        const res = await getBoards();
        setBoards(res.data);
      } catch (error) {
        console.error("Error loading boards:", error);
      }
    };
    loadBoards();
  }, []);

  //  Create new board
  const handleCreateBoard = async () => {
    if (!newBoardName.trim()) return alert("Board name required!");
    try {
      const res = await createBoard({ name: newBoardName, defaultLists: true });
      setBoards([...boards, res.data]);
      setNewBoardName("");
    } catch (error) {
      console.error("Error creating board:", error);
    }
  };

  
  useEffect(() => {
    if (!selectedBoard) return;

    const fetchListsAndCards = async () => {
      try {
        const listsRes = await getListsForBoard(selectedBoard);
        const listsData = listsRes.data;
        setLists(listsData);

        const cardsData: CardsByList = {};
        for (const list of listsData) {
          const cardsRes = await getCardsForList(list.id);
          cardsData[list.id] = cardsRes.data;
        }
        setCards(cardsData);
      } catch (error) {
        console.error("Error loading lists and cards:", error);
      }
    };

    fetchListsAndCards();
  }, [selectedBoard]);

  //  Add Card
  const handleAddCard = async (listId: string) => {
    if (!newCardName.trim()) return;
    try {
      const res = await createTask({
        name: newCardName,
        idList: listId,
        desc: newCardDesc,
      });
      setCards({
        ...cards,
        [listId]: [...(cards[listId] || []), res.data],
      });
      setNewCardName("");
      setNewCardDesc("");
      setAddingCardToList(null);
    } catch (error) {
      console.error("Error creating card:", error);
    }
  };

  //  Update Card
  const handleUpdateCard = async ({
    cardId,
    listId,
    updates,
  }: {
    cardId: string;
    listId: string;
    updates: { name: string; desc?: string };
  }) => {
    const oldCard: any = cards[listId].find((c) => c.id === cardId);

    const payload = {
      name: updates.name ?? oldCard.name,
      idList: listId,
      desc: updates.desc ?? oldCard.desc,
    };

    try {
      await updateTask({ cardId, data: payload });

      setCards({
        ...cards,
        [listId]: cards[listId].map((card) =>
          card.id === cardId ? { ...card, ...payload } : card
        ),
      });

      setEditingCard(null);
    } catch (error) {
      console.error("Error updating card:", error);
    }
  };

  // Delete Card
  const handleDeleteCard = async ({
    cardId,
    listId,
  }: {
    cardId: string;
    listId: string;
  }) => {
    console.log("Deleting:", { cardId, listId });
    try {
      await deleteTask(cardId);
      setCards({
        ...cards,
        [listId]: cards[listId].filter((card) => card.id !== cardId),
      });
      setCardMenuOpen(null);
    } catch (error) {
      console.error("Error deleting card:", error);
    }
  };

  //  Boards View
  if (!selectedBoard) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold text-gray-800 mb-8">My Boards</h1>

          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">
              Create New Board
            </h2>
            <div className="flex gap-3">
              <input
                placeholder="Enter board name..."
                value={newBoardName}
                onChange={(e) => setNewBoardName(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleCreateBoard()}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleCreateBoard}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
              >
                <Plus size={20} />
                Create
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {boards.map((board: any) => (
              <div
                key={board.id}
                onClick={() => setSelectedBoard(board.id)}
                className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg p-6 cursor-pointer hover:shadow-xl transition-all transform hover:-translate-y-1 text-white"
              >
                <h3 className="text-xl font-bold mb-2">{board.name}</h3>
                <p className="text-blue-100">Click to open →</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 p-6">
      {/* Back Button */}
      <div className="mb-6">
        <button
          onClick={() => setSelectedBoard(null)}
          className="px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-white/30 transition-colors font-medium flex items-center gap-2"
        >
          <ArrowLeft size={20} />
          Back to Boards
        </button>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
       
        <div
          className="flex gap-5 overflow-x-auto pb-6 px-2 h-[calc(100vh-8rem)]"
          style={{
            scrollbarWidth: "thin",
            scrollbarColor: "#a0aec0 transparent",
          }}
        >
          {lists.map((list, index) => (
            <div
              key={list.id}
              className={`flex-shrink-0 w-80 rounded-xl p-4 shadow-lg flex flex-col max-h-full transition-transform transform hover:-translate-y-1 ${
                index % 4 === 0
                  ? "bg-purple-100"
                  : index % 4 === 1
                  ? "bg-yellow-100"
                  : index % 4 === 2
                  ? "bg-green-100"
                  : "bg-gray-100"
              }`}
            >
              {/* List Header */}
              <div className="flex justify-between items-center mb-3 sticky top-0 bg-opacity-90 backdrop-blur-sm">
                <h3 className="text-lg font-bold text-gray-800 truncate">
                  {list.name}
                </h3>
              </div>

              {/* Cards */}
              <Droppable droppableId={list.id}>
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="space-y-3 mb-3 overflow-y-auto flex-1 pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent"
                    style={{
                      maxHeight: "calc(100vh - 16rem)",
                      scrollbarWidth: "thin",
                      scrollbarColor: "#cbd5e1 transparent",
                    }}
                  >
                    {(cards[list.id] || []).map((card, idx) => (
                      <Draggable
                        key={card.id}
                        draggableId={card.id}
                        index={idx}
                      >
                        {(dragProvided, snapshot) => (
                          <div
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            {...dragProvided.dragHandleProps}
                            className={
                              "bg-white rounded-lg shadow-sm hover:shadow-md transition-all relative group border border-gray-200 " +
                              (snapshot.isDragging ? "ring-2 ring-blue-400" : "")
                            }
                          >
                            {editingCard === card.id ? (
                              <div className="p-3 space-y-2">
                                <input
                                  autoFocus
                                  defaultValue={card.name}
                                  onChange={(e) =>
                                    setNewCardName(e.target.value)
                                  }
                                  placeholder="Card title"
                                  className="w-full px-2 py-1 border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <textarea
                                  defaultValue={card.desc || ""}
                                  onChange={(e) =>
                                    setNewCardDesc(e.target.value)
                                  }
                                  placeholder="Description..."
                                  rows={3}
                                  className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
                                />
                                <div className="flex gap-2 mt-2">
                                  <button
                                    onClick={() =>
                                      handleUpdateCard({
                                        cardId: card.id,
                                        listId: list.id,
                                        updates: {
                                          name: newCardName || card.name,
                                          desc: newCardDesc || card.desc,
                                        },
                                      })
                                    }
                                    className="px-4 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() => setEditingCard(null)}
                                    className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 text-sm font-medium"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="p-3">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-gray-800 font-medium break-words">
                                      {card.name}
                                    </p>
                                    {card.desc && (
                                      <p className="text-sm text-gray-600 mt-2 break-words">
                                        {card.desc}
                                      </p>
                                    )}
                                  </div>
                                  <button
                                    onClick={() =>
                                      setCardMenuOpen(
                                        cardMenuOpen === card.id
                                          ? null
                                          : card.id
                                      )
                                    }
                                    className="p-1 hover:bg-gray-100 rounded opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                                  >
                                    <MoreVertical
                                      size={16}
                                      className="text-gray-600"
                                    />
                                  </button>
                                </div>

                                {cardMenuOpen === card.id && (
                                  <div className="absolute right-2 top-10 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-10 w-48">
                                    <button
                                      onClick={() => {
                                        setEditingCard(card.id);
                                        setNewCardName(card.name);
                                        setNewCardDesc(card.desc || "");
                                        setCardMenuOpen(null);
                                      }}
                                      className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-3 text-gray-700"
                                    >
                                      <Pencil size={16} />
                                      Edit
                                    </button>
                                    <button
                                      onClick={() =>
                                        handleDeleteCard({
                                          cardId: card.id,
                                          listId: list.id,
                                        })
                                      }
                                      className="w-full px-4 py-2 text-left hover:bg-red-50 flex items-center gap-3 text-red-600"
                                    >
                                      <Trash2 size={16} />
                                      Delete
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>

              {/* Add a Card */}
              {addingCardToList === list.id ? (
                <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
                  {/* Card title input */}
                  <input
                    autoFocus
                    placeholder="Enter card title..."
                    value={newCardName}
                    onChange={(e) => setNewCardName(e.target.value)}
                    className="w-full px-2 py-1 mb-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />

                  {/* Card description input */}
                  <textarea
                    placeholder="Enter description (optional)..."
                    value={newCardDesc}
                    onChange={(e) => setNewCardDesc(e.target.value)}
                    rows={2}
                    className="w-full px-2 py-1 mb-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                  />

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAddCard(list.id)}
                      className="px-4 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => {
                        setAddingCardToList(null);
                        setNewCardName("");
                        setNewCardDesc("");
                      }}
                      className="p-1 hover:bg-gray-200 rounded"
                    >
                      <X size={20} className="text-gray-600" />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setAddingCardToList(list.id)}
                  className="w-full px-4 py-2 text-left text-gray-600 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-2 mt-2 font-medium"
                >
                  <Plus size={20} />
                  Add a card
                </button>
              )}
            </div>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
}
