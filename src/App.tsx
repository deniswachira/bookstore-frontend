import React, { useState, useReducer, useRef, useEffect, useCallback } from 'react';
import axios from './api/axiosConfig';
import './App.scss';
import { PuffLoader } from 'react-spinners';

interface Book {
  book_id: number;
  title: string;
  author: string;
  year: number;
  isEditing?: boolean;  // Optional field for editing state
}

type ActionType =
  | { type: 'SET_BOOKS'; books: Book[] }
  | { type: 'ADD_BOOK'; book: Book }
  | { type: 'UPDATE_BOOK'; book: Book }
  | { type: 'DELETE_BOOK'; book_id: number }
  | { type: 'TOGGLE_EDIT_BOOK'; book_id: number };

const bookReducer = (state: Book[], action: ActionType): Book[] => {
  switch (action.type) {
    case 'SET_BOOKS':
      return action.books;
    case 'ADD_BOOK':
      return [...state, action.book];
    case 'UPDATE_BOOK':
      return state.map(book => (book.book_id === action.book.book_id ? action.book : book));
    case 'DELETE_BOOK':
      return state.filter(book => book.book_id !== action.book_id);
    case 'TOGGLE_EDIT_BOOK':
      return state.map(book =>
        book.book_id === action.book_id ? { ...book, isEditing: !book.isEditing } : book
      );
    default:
      return state;
  }
};

const App: React.FC = () => {
  const [books, dispatch] = useReducer(bookReducer, []);
  const [input, setInput] = useState({ title: '', author: '', year: '' });
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [editFields, setEditFields] = useState<{ [key: number]: Partial<Book> }>({});
  const [loading, setLoading] = useState(false); // Add loading state
  const booksPerPage = 5;

  const inputRef = useRef<HTMLInputElement>(null);


  useEffect(() => {
    const fetchBooks = async () => {
      setLoading(true); // Set loading to true when fetching data
      try {
        const response = await axios.get('/books');
        dispatch({ type: 'SET_BOOKS', books: response.data });
      } catch (error) {
        console.error('Error fetching books:', error);
      } finally {
        setLoading(false); // Set loading to false after data is fetched
      }
    };

    fetchBooks();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setInput(prev => ({ ...prev, [name]: value }));
  };

  const handleAddBook = async () => {
    if (!input.title.trim() || !input.author.trim() || !input.year.trim()) return;
    const newBook = {
      title: input.title,
      author: input.author,
      year: parseInt(input.year),
    };

    try {
      const response = await axios.post('/books', newBook);
      dispatch({ type: 'ADD_BOOK', book: response.data }); // Update state with the new book
      setInput({ title: '', author: '', year: '' }); // Clear input fields after adding
      inputRef.current?.focus(); // Focus on the title input for convenience
    } catch (error) {
      console.error('Error adding book:', error);
    }
  };

  const handleDeleteBook = async (book_id: number) => {
    try {
      await axios.delete(`/books/${book_id}`);
      dispatch({ type: 'DELETE_BOOK', book_id });
    } catch (error) {
      console.error('Error deleting book:', error);
    }
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>, book_id: number) => {
    const { name, value } = e.target;
    setEditFields(prev => ({
      ...prev,
      [book_id]: {
        ...prev[book_id],
        [name]: name === 'year' ? parseInt(value) : value
      }
    }));
  };

  const handleUpdateBook = async (book: Book) => {
    if (editFields[book.book_id]) {
      const updatedFields = editFields[book.book_id];

      try {
        await axios.put(`/books/${book.book_id}`, updatedFields);
        dispatch({ type: 'UPDATE_BOOK', book: { ...book, ...updatedFields, isEditing: false } });
        setEditFields(prev => {
          const newEditFields = { ...prev };
          delete newEditFields[book.book_id];
          return newEditFields;
        });
      } catch (error) {
        console.error('Error updating book:', error);
      }
    } else {
      dispatch({ type: 'TOGGLE_EDIT_BOOK', book_id: book.book_id });
    }
  };

  const handleCancelEdit = (book_id: number) => {
    dispatch({ type: 'TOGGLE_EDIT_BOOK', book_id });
    setEditFields(prev => {
      const newEditFields = { ...prev };
      delete newEditFields[book_id];
      return newEditFields;
    });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

  const filteredBooks = books.filter(book => {
    // Ensure book.title is not undefined before calling toLowerCase()
    return book.title && book.title.toLowerCase().includes(search.toLowerCase());
  });

  const indexOfLastBook = currentPage * booksPerPage;
  const indexOfFirstBook = indexOfLastBook - booksPerPage;
  const currentBooks = filteredBooks.slice(indexOfFirstBook, indexOfLastBook);

  const paginate = useCallback(
    (direction: 'next' | 'prev') => {
      if (direction === 'next' && currentPage < Math.ceil(filteredBooks.length / booksPerPage)) {
        setCurrentPage(prevPage => prevPage + 1);
      } else if (direction === 'prev' && currentPage > 1) {
        setCurrentPage(prevPage => prevPage - 1);
      }
    },
    [currentPage, filteredBooks.length]
  );

  return (
    <div className="app">
      <h1>Book Repository</h1>
      <div className="book-form">
        <input
          ref={inputRef}
          type="text"
          name="title"
          value={input.title}
          onChange={handleInputChange}
          placeholder="Title"
        />
        <input
          type="text"
          name="author"
          value={input.author}
          onChange={handleInputChange}
          placeholder="Author"
        />
        <input
          type="number"
          name="year"
          value={input.year}
          onChange={handleInputChange}
          placeholder="Year"
        />
        <button onClick={handleAddBook}>Add Book</button>
      </div>
      <div className="book-search">
        <input
          type="text"
          value={search}
          onChange={handleSearchChange}
          placeholder="Search by title"
        />
      </div>
      {loading ? (
        <div className='loading'>        
             <PuffLoader
  color="#0cf400"
  size={50}
/>
          </div>
      ) : currentBooks.length === 0 ? (
        <div className="no-records">No books available 😒</div>
      ) : (
        <table className="book-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Book</th>
              <th>Author</th>
              <th>Year</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentBooks.map(book => (
              <tr key={book.book_id}>
                <td>{book.book_id}</td>
                <td>
                  {book.isEditing ? (
                    <input
                      type="text"
                      name="title"
                      value={editFields[book.book_id]?.title ?? book.title}
                      onChange={(e) => handleEditChange(e, book.book_id)}
                    />
                  ) : (
                    book.title
                  )}
                </td>
                <td>
                  {book.isEditing ? (
                    <input
                      type="text"
                      name="author"
                      value={editFields[book.book_id]?.author ?? book.author}
                      onChange={(e) => handleEditChange(e, book.book_id)}
                    />
                  ) : (
                    book.author
                  )}
                </td>
                <td>
                  {book.isEditing ? (
                    <input
                      type="number"
                      name="year"
                      value={editFields[book.book_id]?.year ?? book.year}
                      onChange={(e) => handleEditChange(e, book.book_id)}
                    />
                  ) : (
                    book.year
                  )}
                </td>
                <td className="actions">
                  {book.isEditing ? (
                    <>
                      <button onClick={() => handleUpdateBook(book)}>Save</button>
                      <button onClick={() => handleCancelEdit(book.book_id)}>Cancel</button>
                    </>
                  ) : (
                    <button onClick={() => dispatch({ type: 'TOGGLE_EDIT_BOOK', book_id: book.book_id })}>Edit</button>
                  )}
                  <button onClick={() => handleDeleteBook(book.book_id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="pagination">
        <button onClick={() => paginate('prev')}>Previous</button>
        <button onClick={() => paginate('next')}>Next</button>
      </div>
    </div>
  );
};

export default App;
