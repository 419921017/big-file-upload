export const request = (
  url = '',
  method = 'post',
  data: any,
  headers: Record<string, any>,
  requestList?: any[]
) =>
  new Promise((resolve) => {
    headers = headers || {};
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);
    Object.keys(headers).forEach((key) => {
      xhr.setRequestHeader(key, headers[key]);
    });

    xhr.send(data);

    xhr.onload = (e: any) => resolve(e.target.response);
  });
