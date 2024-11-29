window.onload = function() {
  const urlParams = new URLSearchParams(window.location.search);

  // Success alert
  if (urlParams.get('success') === 'true') {
    Swal.fire({
      icon: 'success',
      title: 'Logged In Successful',
      text: 'You have successfully logged in!',
      confirmButtonText: 'OK'
    }).then((result) => {
      if (result.isConfirmed) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    });
  }

  // User not found error alert
  if (urlParams.get('errorUserNotFound') === 'true') {
    Swal.fire({
      icon: 'error',
      title: 'User Not Found',
      text: 'Check your user',
      confirmButtonText: 'OK'
    }).then((result) => {
      if (result.isConfirmed) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    });
  }

  // Password mismatch error alert
  if (urlParams.get('errorPasswordNotMatch') === 'true') {
    Swal.fire({
      icon: 'error',
      title: 'Password is not match',
      text: 'Check your password',
      confirmButtonText: 'OK'
    }).then((result) => {
      if (result.isConfirmed) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    });
  }
  
  // Email already exists
  if (urlParams.get('errorEmailExists') === 'true') {
    Swal.fire({
      icon: 'error',
      title: 'Email exists',
      text: 'Check your email',
      confirmButtonText: 'OK'
    }).then((result) => {
      if (result.isConfirmed) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    });
  }
  
  // Password +6
  if (urlParams.get('errorPassword6') === 'true') {
    Swal.fire({
      icon: 'error',
      title: 'Password must be at least 6 characters.',
      text: 'Check your password',
      confirmButtonText: 'OK'
    }).then((result) => {
      if (result.isConfirmed) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    });
  }
};