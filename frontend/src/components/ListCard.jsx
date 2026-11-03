import { Alert, Card, Spinner } from 'react-bootstrap';
import Pagination from './Pagination';

/**
 * Khung bảng danh sách đi cùng usePagedList: hiện lỗi, đang tải, danh sách trống và phân trang.
 *
 *   const list = usePagedList(api.listX, filters);
 *   <ListCard list={list} empty="Chưa có dữ liệu">
 *     <Table>...list.data.items...</Table>
 *   </ListCard>
 *
 * children chỉ được render khi đã có dữ liệu và danh sách không trống.
 */
export default function ListCard({ list, empty = 'Không có dữ liệu', children }) {
  const { data, loading, error, setPage } = list;
  return (
    <Card>
      <Card.Body className="p-0">
        {error && (
          <Alert variant="danger" className="m-3">
            {error}
          </Alert>
        )}
        {loading && !data ? (
          <div className="text-center py-5">
            <Spinner animation="border" variant="primary" />
          </div>
        ) : data && data.items.length === 0 ? (
          <p className="text-secondary text-center py-5 mb-0">{empty}</p>
        ) : (
          data && <div style={{ opacity: loading ? 0.5 : 1 }}>{children}</div>
        )}
      </Card.Body>
      {data && data.total > 0 && (
        <Card.Footer className="bg-white">
          <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={setPage} />
        </Card.Footer>
      )}
    </Card>
  );
}
