import { Router } from "express";
import { auth } from "../lib/auth";

const userRouter = Router();

userRouter.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;
  const origin = req.headers.origin;
  console.log(origin)
  if( !name || !email || !password) return res.status(400).json({
    success: false,
    data: null
  })

  const result = await auth.api.signUpEmail({
    body: {
      name: name,
      email: email,
      password: password,
    },
    headers: { origin },
  });

  return res.status(201).json({
    success: true,
    data: {
        token: result.token,
    }
  })
});

export default userRouter;
