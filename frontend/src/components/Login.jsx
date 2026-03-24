import React from "react";

const Login = () => {
  const backendLogin = "http://localhost:8000/auth/login";

  return (
    <div>
      <a href={backendLogin}>
        <button>Sign in with Google</button>
      </a>
    </div>
  );
};

export default Login;
