import client from './client';

// Thể loại (seed sẵn, không có màn hình quản lý): [{ categoryId, name, description }]
export const listCategories = () => client.get('/categories');

// UC006 – Tra cứu. params: { keyword, categoryId, page, pageSize }. Độc giả không thấy đầu sách đã ẩn
export const listBooks = (params) => client.get('/books', { params });
export const getBook = (bookId) => client.get(`/books/${bookId}`);

// UC004 – Quản lý đầu sách (Thủ thư / Admin)
// body: { isbn, title, author, publisher, publishYear, categoryId, description?, copies?, location? }
export const createBook = (body) => client.post('/books', body);
export const updateBook = (bookId, body) => client.put(`/books/${bookId}`, body);
// Trả { deleted: true } nếu xóa hẳn; { deleted: false, book } nếu đã có lịch sử mượn nên chỉ ẩn
export const deleteBook = (bookId) => client.delete(`/books/${bookId}`);
export const setBookHidden = (bookId, hidden) => client.patch(`/books/${bookId}/hidden`, { hidden });

// Bản sách của một đầu sách: { book, copies: [...] }
export const listBookCopies = (bookId) => client.get(`/books/${bookId}/copies`);
export const addCopies = (bookId, quantity, location) => client.post(`/books/${bookId}/copies`, { quantity, location });
