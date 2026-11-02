function toCategoryDto(row) {
  return { categoryId: row.category_id, name: row.category_name, description: row.description };
}

function toBookDto(row) {
  return {
    bookId: row.book_id,
    isbn: row.isbn,
    title: row.title,
    author: row.author,
    publisher: row.publisher,
    publishYear: row.publish_year,
    category: { categoryId: row.category_id, name: row.category_name },
    description: row.description,
    isHidden: Boolean(row.is_hidden),
    totalCopies: row.total_copies,
    availableCopies: row.available_copies,   // số bản Khả dụng (UC006)
  };
}

function toCopyDto(row) {
  return {
    copyId: row.copy_id,
    copyCode: row.copy_code,
    status: row.status,
    location: row.location,
    note: row.note,
    book: { bookId: row.book_id, title: row.title, isbn: row.isbn },
  };
}

module.exports = { toCategoryDto, toBookDto, toCopyDto };
