import http from 'k6/http';
import { sleep, check } from 'k6';
import { Counter } from 'k6/metrics';

export const requests = new Counter('http_reqs');

export default function () {
  //change to have requests to a random product id and make sure it isn't  HIGHER NUMBER THAN THE NUMBER OF ROWS
  const res = http.get('http://localhost:3000/reviews/4');
  //const res = http.get('http://localhost:3000/meta/4');

  sleep(1);

  const checkRes = check(res, {
    'status is 200': (r) => r.status === 200,
  });
}