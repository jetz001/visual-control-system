# Visual Control System API Documentation

Welcome to the API documentation for the Visual Control System.

## Table of Contents

- [Authentication](#authentication)
- [Endpoints](#endpoints)
    - [Get All Controls](#get-all-controls)
    - [Get Control by ID](#get-control-by-id)
    - [Create Control](#create-control)
    - [Update Control](#update-control)
    - [Delete Control](#delete-control)
- [Error Codes](#error-codes)
- [Contact](#contact)

---

## Authentication

All endpoints require an API key in the `Authorization` header.

```
Authorization: Bearer YOUR_API_KEY
```

---

## Endpoints

### Get All Controls

- **URL:** `/api/controls`
- **Method:** `GET`
- **Description:** Returns a list of all controls.

#### Response

```json
[
    {
        "id": "string",
        "name": "string",
        "status": "active"
    }
]
```

---

### Get Control by ID

- **URL:** `/api/controls/{id}`
- **Method:** `GET`
- **Description:** Returns details of a specific control.

#### Response

```json
{
    "id": "string",
    "name": "string",
    "status": "active"
}
```

---

### Create Control

- **URL:** `/api/controls`
- **Method:** `POST`
- **Description:** Creates a new control.

#### Request Body

```json
{
    "name": "string",
    "status": "active"
}
```

#### Response

```json
{
    "id": "string",
    "name": "string",
    "status": "active"
}
```

---

### Update Control

- **URL:** `/api/controls/{id}`
- **Method:** `PUT`
- **Description:** Updates an existing control.

#### Request Body

```json
{
    "name": "string",
    "status": "inactive"
}
```

#### Response

```json
{
    "id": "string",
    "name": "string",
    "status": "inactive"
}
```

---

### Delete Control

- **URL:** `/api/controls/{id}`
- **Method:** `DELETE`
- **Description:** Deletes a control.

#### Response

```json
{
    "message": "Control deleted successfully."
}
```

---

## Error Codes

| Code | Description              |
|------|--------------------------|
| 400  | Bad Request              |
| 401  | Unauthorized             |
| 404  | Not Found                |
| 500  | Internal Server Error    |

---

## Contact

For support, contact: [support@visualcontrolsystem.com](mailto:support@visualcontrolsystem.com)
